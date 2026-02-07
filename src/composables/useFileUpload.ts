import { ref } from 'vue';
import { API_BASE } from '../config/env';
import type { UploadResponse, ConvertResponse } from '../types';

export function useFileUpload(getToken: () => Promise<string | null>) {
    const fileInput = ref<HTMLInputElement>();
    const selectedFile = ref<File | null>(null);
    const isDragging = ref(false);
    const isUploading = ref(false);
    const uploadProgress = ref(0);
    const statusMessage = ref('');
    const currentFileId = ref<number | null>(null);
    const successFileUrl = ref('');

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const setProgressAtLeast = (value: number) => {
        uploadProgress.value = Math.min(100, Math.max(uploadProgress.value, value));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const triggerFileInput = () => {
        fileInput.value?.click();
    };

    const handleFileSelect = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedFile.value = target.files[0];
        }
    };

    const handleDragOver = () => {
        isDragging.value = true;
    };

    const handleDragLeave = () => {
        isDragging.value = false;
    };

    const handleDrop = (event: DragEvent) => {
        isDragging.value = false;
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            selectedFile.value = event.dataTransfer.files[0];
        }
    };

    const pollConvertResult = async (fileId: number) => {
        const maxAttempts = 30;
        const intervalMs = 3000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const token = await getToken();
            const convertRes = await fetch(`${API_BASE}/openapi/file/convert/result?fileId=${fileId}`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });

            const convertData: ConvertResponse = await convertRes.json();

            if (!convertRes.ok || convertData.code !== 200 || !convertData.data) {
                throw new Error(convertData.msg || '转换查询失败');
            }

            const { status, files } = convertData.data;

            if (status === 1) {
                statusMessage.value = '待转换，请稍候...';
                setProgressAtLeast(30);
            } else if (status === 2) {
                statusMessage.value = '转换中，请耐心等待...';
                setProgressAtLeast(60);
            } else if (status === 3) {
                const fileUrl = files?.xtc || files?.xtd;

                if (!fileUrl) {
                    statusMessage.value = '转换成功，等待文件地址返回...';
                } else {
                    uploadProgress.value = 100;
                    statusMessage.value = '转换成功，点击打开文件';
                    isUploading.value = false;
                    successFileUrl.value = fileUrl;
                    return;
                }
            } else if (status === 4) {
                throw new Error(convertData.msg || '转换失败');
            }

            await delay(intervalMs);
        }

        throw new Error('转换超时，请稍后重试');
    };

    const uploadFile = async () => {
        if (!selectedFile.value) {
            alert('请先选择需要转换的文件');
            return;
        }

        const token = await getToken();
        if (!token) {
            alert('未获取到 Token，请检查 clientId/clientSecret 环境变量并重试');
            return;
        }

        isUploading.value = true;
        uploadProgress.value = 0;
        statusMessage.value = '';
        currentFileId.value = null;
        successFileUrl.value = '';

        try {
            statusMessage.value = '正在上传文件...';

            const formData = new FormData();
            formData.append('file', selectedFile.value);

            const uploadRes = await fetch(`${API_BASE}/openapi/file/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const uploadData: UploadResponse = await uploadRes.json();

            if (!uploadRes.ok || uploadData.code !== 200 || !uploadData.data?.fileId) {
                throw new Error(uploadData.msg || '上传失败');
            }

            currentFileId.value = uploadData.data.fileId;
            setProgressAtLeast(20);
            statusMessage.value = '上传成功，正在排队转换...';

            await pollConvertResult(uploadData.data.fileId);
        } catch (error) {
            console.error('文件转换失败:', error);
            statusMessage.value = error instanceof Error ? error.message : '文件转换失败，请重试';
            isUploading.value = false;
            alert(statusMessage.value);
        }
    };

    return {
        fileInput,
        selectedFile,
        isDragging,
        isUploading,
        uploadProgress,
        statusMessage,
        currentFileId,
        successFileUrl,
        formatFileSize,
        triggerFileInput,
        handleFileSelect,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        uploadFile
    };
}
