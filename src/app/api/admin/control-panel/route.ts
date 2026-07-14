import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const APP_BUCKETS = ["service-orders", "legal-documents", "tender_documents", "tender-documents"];
const DEFAULT_QUOTA_BYTES = 500 * 1024 * 1024;

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

function periodStart(period: string | null) {
    const now = new Date();
    const since = new Date(now);
    if (period === "week") since.setDate(now.getDate() - 7);
    else if (period === "month") since.setMonth(now.getMonth() - 1);
    else if (period === "year") since.setFullYear(now.getFullYear() - 1);
    else since.setHours(0, 0, 0, 0);
    return since;
}

async function sumSizeColumn(admin: ReturnType<typeof getAdminClient>, table: string) {
    const { data, error } = await admin.from(table).select("size_bytes");
    if (error || !data) return 0;
    return data.reduce((total, row: any) => total + Number(row.size_bytes || 0), 0);
}

export async function GET(request: NextRequest) {
    try {
        const admin = getAdminClient();
        const period = request.nextUrl.searchParams.get("period");
        const since = periodStart(period);

        const health = await admin
            .from("team_members")
            .select("id", { count: "exact", head: true });

        const [accessResult, profilesResult, storageResult, serviceOrdersBytes, legalDocsBytes, dbUsageResult] = await Promise.all([
            admin
                .from("access_logs")
                .select("*")
                .gte("accessed_at", since.toISOString())
                .order("accessed_at", { ascending: false }),
            admin
                .from("profiles")
                .select("id,email,full_name,avatar_url,last_seen,role")
                .order("last_seen", { ascending: false, nullsFirst: false }),
            admin
                .schema("storage")
                .from("objects")
                .select("bucket_id,name,metadata,created_at,updated_at")
                .in("bucket_id", APP_BUCKETS),
            sumSizeColumn(admin, "service_orders"),
            sumSizeColumn(admin, "legal_documents"),
            admin.rpc("sonar_database_usage")
        ]);

        const storageRows = storageResult.data || [];
        const storageBytes = storageRows.reduce((total: number, row: any) => {
            return total + Number(row.metadata?.size || row.metadata?.contentLength || 0);
        }, 0);

        const rpcRow = Array.isArray(dbUsageResult.data) ? dbUsageResult.data[0] : dbUsageResult.data;
        const appBytes = Math.max(storageBytes, serviceOrdersBytes + legalDocsBytes);
        const databaseBytes = Number(rpcRow?.database_bytes || 0);
        const quotaBytes = Number(
            rpcRow?.quota_bytes ||
            process.env.SUPABASE_STORAGE_QUOTA_BYTES ||
            DEFAULT_QUOTA_BYTES
        );

        const uniqueAccessLogs = (accessResult.data || []).filter((log: any, index: number, list: any[]) => {
            const key = log.user_id || log.user_email || log.id;
            return list.findIndex(item => (item.user_id || item.user_email || item.id) === key) === index;
        });

        return NextResponse.json({
            ok: !health.error,
            checkedAt: new Date().toISOString(),
            message: health.error?.message || null,
            accessLogs: uniqueAccessLogs,
            profiles: profilesResult.data || [],
            usage: {
                appBytes,
                storageBytes,
                databaseBytes,
                quotaBytes,
                objectCount: storageRows.length,
                source: dbUsageResult.error ? "app_estimate" : "database_rpc"
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            ok: false,
            checkedAt: new Date().toISOString(),
            message: error?.message || "Erro ao consultar painel de controle.",
            accessLogs: [],
            profiles: [],
            usage: {
                appBytes: 0,
                storageBytes: 0,
                databaseBytes: 0,
                quotaBytes: DEFAULT_QUOTA_BYTES,
                objectCount: 0,
                source: "unavailable"
            }
        }, { status: 200 });
    }
}
