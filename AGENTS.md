# AGENTS.md

## 项目概览

这个工作区包含多个和《血染钟楼》相关的项目：

- `xueran/`：主微信小程序项目，基于 uni-app，通常用 HBuilderX 打开和运行。
- `xueran-admin/`：基于 uni-admin 的管理后台模板。
- `townsquare-develop/`：Vue 2 版 Town Square Web 应用的定制/分支项目。
- `docs/`、`specs/`、`scripts/`：项目文档、规格说明和辅助脚本。

改动时优先定位到最相关的子项目，尽量只改必要范围。不要把仓库根目录当成 Node 项目；根目录没有 `package.json`。

## 已确认命令

运行命令时，请先进入拥有对应 `package.json` 的子目录。

### `townsquare-develop/`

- 安装依赖：`npm install`
- 启动开发服务器：`npm run serve`
- 构建：`npm run build`
- 自动修复 lint：`npm run lint`
- CI lint：`npm run lint-ci`

### `xueran/`

- 使用 HBuilderX 3.0+ 打开 `xueran/` 目录。
- 通过 HBuilderX 运行到 H5 或微信开发者工具。
- 该子项目未发现根 `package.json`，不要编造 npm 命令。

### `xueran-admin/`

- 这是 uni-admin / uniCloud 项目，通常通过 HBuilderX 运行。
- `package.json` 里只有默认的失败占位 `test` 脚本，不要把它当成有效验证命令。

## 目录约定

- `xueran/pages/`：小程序页面。
- `xueran/utils/`：客户端 API 和工具模块。
- `xueran/static/`：小程序静态资源。
- `xueran/uniCloud-aliyun/`：uniCloud 云函数和数据库 schema。
- `xueran-admin/pages/admin/`：管理后台业务页面。
- `xueran-admin/js_sdk/`：后台侧 SDK 辅助工具。
- `xueran-admin/uni_modules/`：DCloud / uni-app 模块；除非任务明确要求，否则避免修改这些第三方/框架模块。
- `townsquare-develop/src/`：Vue 2 前端源码。
- `townsquare-develop/server/`：房间、会话等服务端代码。
- `townsquare-develop/scripts/`：独立验证脚本和辅助脚本。

## 代码风格

- 保持被修改文件的现有风格。
- `townsquare-develop/` 使用 Vue 2、JavaScript、SCSS、Vuex、ESLint 和 Prettier。遵循 `.eslintrc.js` 和现有 2 空格缩进风格。
- `xueran/` 和 `xueran-admin/` 使用 uni-app / Vue 单文件组件和 JavaScript。很多文件使用 tab 缩进，编辑附近代码时保持一致。
- 优先沿用已有 Vue Options API 写法。
- 新增逻辑前，先复用现有的 `utils/`、`js_sdk/`、`store/` 和已有组件。
- 不要引入新的生产依赖，除非用户明确同意。
- 改动保持聚焦；避免无关重构、大范围格式化或不必要的文件重命名。

## 生成文件和本地文件

除非用户明确要求，不要编辑或提交这些生成/本地运行文件：

- `node_modules/`
- `dist/`
- `unpackage/`
- `output/`
- `logs/`
- `tmp/`
- 本地 `.env*` 文件，但已跟踪的示例文件如 `.env.example` 除外
- `*.log`

特别注意 `uni_modules/`：默认把它们视为框架或第三方模块，只有任务明确涉及某个模块时才修改。

## 验证建议

- 修改 `townsquare-develop/` 后，根据改动类型运行最相关的已确认命令：
  - UI 或源码改动：`npm run lint` 或 `npm run lint-ci`
  - 构建或配置改动：`npm run build`
  - 本地行为检查：`npm run serve`
- 修改 `xueran/` 或 `xueran-admin/` 后，优先使用 HBuilderX / 微信开发者工具验证。如果当前环境无法运行，要在最终回复里说明。
- 如果被修改区域没有可靠的验证命令，请在最终回复里说明，不要编造命令。

## Git 和安全规则

- 不要运行 `git reset --hard`。
- 不要回滚用户已有改动，除非用户明确要求。
- 如果要编辑的文件已有无关改动，要基于这些改动继续工作，不要丢弃它们。
- 不要修改密钥、凭证、证书、部署配置或生产环境值，除非用户明确要求。
- 不要删除数据文件、生成资源、云函数或数据库 schema，除非任务明确需要。
