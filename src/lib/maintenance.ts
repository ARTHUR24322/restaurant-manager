import { prisma } from "./prisma";

export async function isFeatureInMaintenance(key: string): Promise<boolean> {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key }
        });
        return config?.value === "true";
    } catch {
        return false;
    }
}
