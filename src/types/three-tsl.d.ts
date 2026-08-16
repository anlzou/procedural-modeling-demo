/**
 * 环境声明：`three/tsl`（Three.js Shading Language）子模块。
 *
 * 该模块在运行时由 `three/build/three.tsl.js` 提供，但项目未安装 `@types/three`，
 * 导致 TS 在部分解析模式下无法为其找到类型声明（TS7016）。
 * 这里将其声明为 ambient 模块（导出为 any），仅影响 IDE 诊断，不影响运行时与构建。
 */
declare module 'three/tsl'
