export type UploadResponse = {
    code: number;
    data?: { fileId?: number };
    msg?: string;
};

export type ConvertResponse = {
    code: number;
    data?: {
        fileId: number;
        status: number;
        files?: { xtd?: string; xtc?: string };
        fileName?: string;
        fileSize?: number;
    };
    msg?: string;
};
