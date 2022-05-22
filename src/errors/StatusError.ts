export class StatusError extends Error{
    statusCode: number;
    message: string;
    constructor(message?: string, statusCode?: number) {
        const tempMsg = message ?? "Internal server error";
        super(tempMsg);
        this.message = tempMsg;
        this.statusCode = statusCode ?? 500;
    }
}