export const DEFAULT_CONVER_USER = "default";

export function converFieldPk(
    IdTabla: string,
    IdCampo: string,
    idusuario: string = DEFAULT_CONVER_USER
) {
    return {
        IdTabla_IdCampo_idusuario: {
            IdTabla,
            IdCampo,
            idusuario,
        },
    };
}
