import { createApp } from 'vue';
import './style.css';
import '@xtctwins/tctwins-bimx-united-viewer/dist/style.css';
import App from './App.vue';
import { createPinia } from "pinia";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

const storePinia = createPinia();
const app = createApp(App);
app.use(storePinia);
// 全局图标配置
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.mount('#app');
