type PathRouter = {
    push: (href: string) => void;
    replace: (href: string) => void;
};

function pathWithoutSearch(path: string): string {
    const q = path.indexOf("?");
    return q >= 0 ? path.slice(0, q) : path;
}

function isHomePath(path: string): boolean {
    const pathname = pathWithoutSearch(path);
    return pathname === "/home" || pathname === "/";
}

/** Last path the user asked for (tab/menu). Ignores a delayed usePathname. */
let selectedWorkspacePath: string | null = null;

function markSelectedPath(path: string): void {
    selectedWorkspacePath = path;
}

if (typeof window !== "undefined") {
    window.addEventListener("popstate", () => {
        selectedWorkspacePath = window.location.pathname;
    });
}

export function isStaleWorkspacePath(pathName: string): boolean {
    return Boolean(selectedWorkspacePath && selectedWorkspacePath !== pathName);
}

/**
 * Updates the address bar for workspace tabs without a Next.js navigation
 * (those race and leave the URL ~1s behind). Real router navigation is only
 * used to enter or leave /home, which lives outside the workspace layout.
 */
export function syncWorkspacePath(
    path: string,
    router: PathRouter,
    mode: "push" | "replace" = "push",
): void {
    if (!path || typeof window === "undefined") return;

    markSelectedPath(pathWithoutSearch(path));

    const current = window.location.pathname;
    const nextPathname = pathWithoutSearch(path);
    const nextSearch = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    if (current === nextPathname && window.location.search === nextSearch) return;

    if (isHomePath(path) || isHomePath(current)) {
        if (mode === "replace") {
            router.replace(path);
        } else {
            router.push(path);
        }
        return;
    }

    if (mode === "replace") {
        window.history.replaceState(window.history.state, "", path);
    } else {
        window.history.pushState(window.history.state, "", path);
    }
}
