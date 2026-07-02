import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cmoOrganizationGroups } from '@/lib/cmo-organizations';

export const dynamic = 'force-dynamic';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error('Supabase admin credentials not configured.');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
};

const getBearerToken = (req: NextRequest) => {
    const authHeader = req.headers.get('authorization') || '';
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
};

const requireUser = async (req: NextRequest, admin = getAdminClient()) => {
    const token = getBearerToken(req);
    if (!token) throw new Error('Sessao ausente.');

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user?.email) throw new Error('Sessao invalida.');
    return data.user;
};

const withSetupHint = (error: any) => {
    const message = String(error?.message || error || '');
    if (/permission denied/i.test(message)) {
        return 'As tabelas da relacao oficial de OM existem, mas estao sem permissao no Supabase. Execute o SQL supabase_official_organizations.sql.';
    }
    if (/military_command_groups|military_organizations|does not exist|schema cache|Could not find/i.test(message)) {
        return 'Estrutura da relacao oficial de OM ainda nao criada no Supabase. Execute o SQL supabase_official_organizations.sql.';
    }
    return message || 'Erro inesperado.';
};

const toSlug = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

const seedIfEmpty = async (admin: ReturnType<typeof getAdminClient>) => {
    const { count, error } = await admin
        .from('military_command_groups')
        .select('id', { count: 'exact', head: true });

    if (error) throw error;
    if ((count || 0) > 0) return;

    const groupRows = cmoOrganizationGroups.map((group, index) => ({
        id: group.id,
        name: group.name,
        location: group.location,
        position: index + 1,
        is_active: true,
    }));

    const organizationRows = cmoOrganizationGroups.flatMap(group =>
        group.units.map((unit, index) => ({
            id: unit.id,
            group_id: group.id,
            name: unit.name,
            position: index + 1,
            is_active: true,
        }))
    );

    const { error: groupsError } = await admin.from('military_command_groups').upsert(groupRows);
    if (groupsError) throw groupsError;

    const { error: organizationsError } = await admin.from('military_organizations').upsert(organizationRows);
    if (organizationsError) throw organizationsError;
};

const loadGroups = async (admin: ReturnType<typeof getAdminClient>) => {
    await seedIfEmpty(admin);

    const [{ data: groups, error: groupsError }, { data: organizations, error: organizationsError }] = await Promise.all([
        admin
            .from('military_command_groups')
            .select('id, name, location, position')
            .eq('is_active', true)
            .order('position', { ascending: true }),
        admin
            .from('military_organizations')
            .select('id, group_id, name, position')
            .eq('is_active', true)
            .order('position', { ascending: true }),
    ]);

    if (groupsError) throw groupsError;
    if (organizationsError) throw organizationsError;

    return (groups || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        location: group.location || '',
        position: group.position,
        units: (organizations || [])
            .filter((organization: any) => organization.group_id === group.id)
            .map((organization: any) => ({
                id: organization.id,
                name: organization.name,
                position: organization.position,
            })),
    }));
};

export async function GET(req: NextRequest) {
    try {
        const admin = getAdminClient();
        await requireUser(req, admin);
        const groups = await loadGroups(admin);
        return NextResponse.json({ groups });
    } catch (err: any) {
        return NextResponse.json({ error: withSetupHint(err) }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = getAdminClient();
        await requireUser(req, admin);
        const body = await req.json();
        const now = new Date().toISOString();

        if (body.action === 'addGroup') {
            const { data: current } = await admin
                .from('military_command_groups')
                .select('position')
                .order('position', { ascending: false })
                .limit(1);

            const position = ((current?.[0]?.position as number | undefined) || 0) + 1;
            const name = String(body.name || `Novo grande comando ${position}`).trim();
            const id = `${toSlug(name) || 'grupo'}-${Date.now()}`;
            const { error } = await admin.from('military_command_groups').insert({
                id,
                name,
                location: String(body.location || '').trim(),
                position,
                is_active: true,
                updated_at: now,
            });
            if (error) throw error;
        }

        if (body.action === 'updateGroup') {
            const { error } = await admin
                .from('military_command_groups')
                .update({
                    name: String(body.name || 'Grande comando sem nome').trim() || 'Grande comando sem nome',
                    location: String(body.location || '').trim(),
                    updated_at: now,
                })
                .eq('id', body.groupId);
            if (error) throw error;
        }

        if (body.action === 'deleteGroup') {
            const { error } = await admin
                .from('military_command_groups')
                .update({ is_active: false, updated_at: now })
                .eq('id', body.groupId);
            if (error) throw error;
        }

        if (body.action === 'addOrganization') {
            const { data: current } = await admin
                .from('military_organizations')
                .select('position')
                .eq('group_id', body.groupId)
                .order('position', { ascending: false })
                .limit(1);

            const position = ((current?.[0]?.position as number | undefined) || 0) + 1;
            const name = String(body.name || `Nova OM ${position}`).trim();
            const id = `${toSlug(name) || 'om'}-${Date.now()}`;
            const { error } = await admin.from('military_organizations').insert({
                id,
                group_id: body.groupId,
                name,
                position,
                is_active: true,
                updated_at: now,
            });
            if (error) throw error;
        }

        if (body.action === 'updateOrganization') {
            const { error } = await admin
                .from('military_organizations')
                .update({
                    name: String(body.name || 'OM sem nome').trim() || 'OM sem nome',
                    group_id: body.groupId,
                    updated_at: now,
                })
                .eq('id', body.organizationId);
            if (error) throw error;
        }

        if (body.action === 'deleteOrganization') {
            const { error } = await admin
                .from('military_organizations')
                .update({ is_active: false, updated_at: now })
                .eq('id', body.organizationId);
            if (error) throw error;
        }

        const groups = await loadGroups(admin);
        return NextResponse.json({ groups });
    } catch (err: any) {
        return NextResponse.json({ error: withSetupHint(err) }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}
