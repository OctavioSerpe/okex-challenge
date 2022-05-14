export class StatusError extends Error{
    statusCode: number;
    message: string;
    constructor(message?: string, statusCode?: number) {
        const tempMrsg = message ?? "Internal server error";
        super(tempMrsg);
        this.message = tempMrsg;
        Object.setPrototypeOf(this, StatusError.prototype);
        this.statusCode = statusCode ?? 500;
    }
}