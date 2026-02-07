<template>
  <div class="page">
    <div v-if="viewerMode" class="viewer-container">
      <button class="back-btn" @click="goHome">← 返回上传页</button>
      <UnitedViewer
        :file-path="fileFromQuery"
        :fonts="fonts"
        :load-meta="true"
        :nav-cube-size="120"
        :background-color="'#d0d0d0'"
        :showNavCube="true"
        :reset="true"
        :inspector="true"
        :is-pc="true"
        :measure="true"
        :comment="true"
        :hidden="true"
        :layer="true"
        :screenshot="true"
        :fullscreen="true"
        :gray="true"
        :measureScale="true"
        :riserLabel="true"
        :panel-right-keys="['anno']"
        :panel-right-width="300"
      />
    </div>

    <div v-else class="card">
      <h1 class="title">BIMX Viewer</h1>

      <div
        class="upload-area"
        :class="{ 'drag-over': isDragging }"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @click="triggerFileInput"
      >
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p class="primary-text">点击或拖拽文件到此处上传</p>
          <p class="secondary-text">支持 IFC / RVT / DWG / DXF 等</p>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".ifc,.rvt,.dwg,.dxf"
          @change="handleFileSelect"
          style="display: none"
        />
      </div>

      <div v-if="selectedFile" class="file-info">
        <p><strong>文件：</strong>{{ selectedFile.name }}</p>
        <p><strong>大小：</strong>{{ formatFileSize(selectedFile.size) }}</p>
        <button
          v-if="!successFileUrl"
          class="primary-btn"
          @click="uploadFile"
          :disabled="isUploading || tokenLoading"
        >
          {{ isUploading ? "转换中..." : "开始转换并预览" }}
        </button>
      </div>

      <div v-if="isUploading" class="progress">
        <div class="bar">
          <div class="fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <div class="progress-text">{{ uploadProgress }}%</div>
        <div class="status" v-if="statusMessage">{{ statusMessage }}</div>
      </div>

      <div v-if="successFileUrl" class="success">
        <p>转换成功</p>
        <button class="success-btn" @click="openViewer(successFileUrl)">
          转换成功，打开文件
        </button>
      </div>

      <div class="tips">
        <p>查看：点击“转换成功，打开文件”会在新标签页加载对应文件。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { UnitedViewer } from "@xtctwins/tctwins-bimx-united-viewer";
import { fonts } from "./config/constants";
import { useFileUpload } from "./composables/useFileUpload";
import {
  AUTH_BASE,
  CLIENT_ID,
  CLIENT_SECRET,
  AUTH_TIMEOUT
} from "./config/env";

const token = ref<string | null>(localStorage.getItem("bimx_token"));
const tokenLoading = ref(false);
const tokenError = ref("");
const viewerMode = ref(false);
const fileFromQuery = ref("");

const fetchToken = async (): Promise<string | null> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    tokenError.value = "缺少 clientId 或 clientSecret 环境变量";
    return null;
  }

  tokenLoading.value = true;
  tokenError.value = "";

  try {
    const payload: Record<string, unknown> = {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    };

    if (AUTH_TIMEOUT) {
      payload.timeout = Number(AUTH_TIMEOUT);
    }

    const res = await fetch(`${AUTH_BASE}/openapi/oauth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.code !== 200 || !data.data?.token) {
      throw new Error(data.msg || "获取 token 失败");
    }

    token.value = data.data.token as string;
    localStorage.setItem("bimx_token", token.value);
    return token.value;
  } catch (error) {
    token.value = null;
    tokenError.value =
      error instanceof Error ? error.message : "获取 token 失败";
    return null;
  } finally {
    tokenLoading.value = false;
  }
};

const getToken = async () => {
  if (token.value) return token.value;
  return fetchToken();
};

const {
  fileInput,
  selectedFile,
  isDragging,
  isUploading,
  uploadProgress,
  statusMessage,
  successFileUrl,
  formatFileSize,
  triggerFileInput,
  handleFileSelect,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  uploadFile: doUpload
} = useFileUpload(getToken);

const uploadFile = () => {
  doUpload();
};

const openViewer = (url: string) => {
  const target = `${window.location.origin}${window.location.pathname}?file=${encodeURIComponent(url)}`;
  window.open(target, "_blank");
};

const goHome = () => {
  window.location.href = window.location.origin + window.location.pathname;
};

const initFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const fileParam = params.get("file");
  if (fileParam) {
    fileFromQuery.value = decodeURIComponent(fileParam);
    viewerMode.value = true;
  }
};

initFromQuery();
fetchToken();
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5faff;
}

.card {
  width: 100%;
  max-width: 720px;
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.desc {
  margin: 0;
  color: #475569;
  font-size: 14px;
}

.note {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 14px;
  color: #1f2937;
}

.token-box {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.token-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1f2937;
}

.token-status .ok {
  color: #16a34a;
  font-weight: 600;
}

.token-status .warn {
  color: #dc2626;
}

.token-status .muted {
  color: #6b7280;
}

.secondary-btn {
  padding: 10px 14px;
  border: 1px solid #d0d7e2;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn:not(:disabled):hover {
  border-color: #2563eb;
  color: #2563eb;
}

.field input {
  padding: 10px 12px;
  border: 1px solid #d0d7e2;
  border-radius: 10px;
  font-size: 14px;
}

.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.25s ease;
}

.upload-area.drag-over {
  border-color: #2563eb;
  background: #eef2ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text .primary-text {
  font-size: 16px;
  color: #0f172a;
  margin: 0 0 6px 0;
  font-weight: 600;
}

.upload-text .secondary-text {
  margin: 0;
  color: #475569;
  font-size: 13px;
}

.file-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
}

.primary-btn {
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn:not(:disabled):hover {
  background: #1d4ed8;
}

.progress {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
}

.bar {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 8px;
  font-size: 13px;
  color: #0f172a;
}

.status {
  margin-top: 4px;
  font-size: 13px;
  color: #475569;
}

.success {
  padding: 14px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
}

.success-btn {
  margin-top: 8px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #22c55e;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.success-btn:hover {
  background: #16a34a;
}

.tips {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.viewer-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: white;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  z-index: 10;
}
</style>
