export const devOnlyPaths = new Set([
    "/execucao-orcamentaria",
    "/tenders",
    "/links",
    "/reports",
    "/admin",
    "/admin/notifications",
]);

const devUserEmails = new Set([
    "edersouzamelo@gmail.com",
    "edersouzamelo",
]);

const normalizeIdentity = (value?: string | null) =>
    (value || "")
        .toLowerCase()
        .trim();

export const isDeveloperIdentity = (identity?: { email?: string | null; name?: string | null } | null) => {
    const email = normalizeIdentity(identity?.email);
    const name = normalizeIdentity(identity?.name);
    const emailUser = email.includes("@") ? email.split("@")[0] : email;

    return devUserEmails.has(email) || devUserEmails.has(emailUser) || devUserEmails.has(name);
};

export const isDevOnlyPath = (pathname: string) =>
    devOnlyPaths.has(pathname) || Array.from(devOnlyPaths).some(path => pathname.startsWith(`${path}/`));
