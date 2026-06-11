# Renhotec Academy - 前端应用

## 项目概述

Renhotec Academy 前端是基于 Nuxt 3 构建的单页应用（SPA），提供企业培训和考试的用户界面。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Nuxt | 3.x | Vue 框架 |
| Vue | 3.5 | 前端框架 |
| Nuxt UI | 2.x | UI 组件库 |
| Pinia | 2.x | 状态管理 |
| Tailwind CSS | 3.x | CSS 框架 |
| TypeScript | 5.x | 类型系统 |
| Vitest | 1.x | 单元测试 |

## 项目结构

```
academy_nuxt/
├── assets/
│   └── css/                   # 全局样式
├── components/
│   ├── exam/                  # 考试相关组件
│   ├── layout/                # 布局组件
│   └── course/                # 课程相关组件
├── composables/               # 组合式函数
├── layouts/                   # 布局文件
├── middleware/                # 路由中间件
├── pages/
│   ├── admin/                 # 管理后台页面
│   ├── course/                # 课程详情页
│   ├── exam/                  # 考试页面
│   ├── mentor/                # 导师页面
│   ├── series/                # 系列详情页
│   ├── index.vue              # 首页
│   ├── login.vue              # 登录页
│   └── my-exams.vue           # 我的考试
├── public/                    # 静态资源
├── stores/                    # Pinia 状态
├── utils/                     # 工具函数
├── app.vue                    # 根组件
├── nuxt.config.ts             # Nuxt 配置
└── package.json               # 依赖配置
```

## 页面结构

### 学员端
| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 培训中心，展示课程分类和系列 |
| 系列详情 | `/series/[id]` | 系列下的课程列表 |
| 课程详情 | `/course/[id]` | 课程学习页面 |
| 考试列表 | `/exam` | 考试中心 |
| 考试答题 | `/exam/[id]` | 考试答题页面 |
| 考试结果 | `/exam/result/[id]` | 考试成绩和错题 |
| 我的考试 | `/my-exams` | 考试记录 |
| 登录 | `/login` | 用户登录 |

### 管理端
| 页面 | 路径 | 说明 |
|------|------|------|
| 管理首页 | `/admin` | 管理后台首页 |
| 课程管理 | `/admin/courses` | CRUD 课程 |
| 分类管理 | `/admin/categories` | 分类管理 |
| 系列管理 | `/admin/series` | 系列管理 |
| 考试管理 | `/admin/exams` | 考试和题目管理 |
| 用户管理 | `/admin/users` | 用户账户管理 |
| 学习进度 | `/admin/learning-progress` | 进度统计 |
| 待批改 | `/admin/pending-reviews` | 考试批改 |
| 导师绑定 | `/admin/mentor-bindings` | 导师学员关系 |
| 评论管理 | `/admin/comments` | 评论审核 |
| 系统设置 | `/admin/settings` | 系统配置 |
| 审计日志 | `/admin/audit-logs` | 操作记录 |

### 导师端
| 页面 | 路径 | 说明 |
|------|------|------|
| 待批改 | `/mentor/pending` | 待批改试卷 |

## 组件

### 考试组件
| 组件 | 说明 |
|------|------|
| ExamModal | 考试答题弹窗 |
| ExamFullscreen | 全屏考试模式 |
| QuestionCard | 题目卡片 |
| WrongQuestionItem | 错题详情 |

### 布局组件
| 组件 | 说明 |
|------|------|
| AppHeader | 顶部导航 |
| AppSidebar | 侧边栏 |
| NotificationBell | 通知铃铛 |

### 课程组件
| 组件 | 说明 |
|------|------|
| VideoPlayer | 视频播放器 |
| DocumentReader | 文档阅读器 |
| CourseCard | 课程卡片 |
| AttachmentDownload | 附件下载 |

## 状态管理

### useAuthStore
- `token` - 认证令牌
- `user` - 当前用户信息
- `login()` - 登录
- `logout()` - 登出

### useSettingsStore
- `system_name` - 系统名称
- `system_subtitle` - 系统副标题
- `system_logo` - 系统 Logo

## 环境变量

```env
# API 地址（留空则自动拼接）
NUXT_PUBLIC_API_BASE=
```

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev -- --host 0.0.0.0 --port 3000

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 生成静态站点
npm run generate
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并监听变化
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行指定测试文件
npm run test -- --filter=CourseCard
```

### 测试结构

```
tests/
├── components/                # 组件测试
│   ├── CourseCard.test.ts
│   ├── VideoPlayer.test.ts
│   └── ...
├── composables/               # 组合式函数测试
│   ├── useApi.test.ts
│   └── ...
├── pages/                     # 页面测试
│   ├── login.test.ts
│   └── ...
└── setup.ts                   # 测试配置
```

### 编写测试

```typescript
// tests/components/CourseCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CourseCard from '~/components/CourseCard.vue'

describe('CourseCard', () => {
  it('renders course title', () => {
    const wrapper = mount(CourseCard, {
      props: {
        course: {
          id: 1,
          title: 'Test Course',
          type: 'video',
        },
      },
    })

    expect(wrapper.text()).toContain('Test Course')
  })

  it('shows progress when provided', () => {
    const wrapper = mount(CourseCard, {
      props: {
        course: { id: 1, title: 'Test Course' },
        progress: { progress_percentage: 50, is_completed: false },
      },
    })

    expect(wrapper.text()).toContain('50%')
  })
})
```

### 测试配置

在 `vitest.config.ts` 中配置：

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

## 开发规范

### 代码风格
- 使用 TypeScript
- 使用 Composition API
- 使用 Nuxt UI 组件库
- 遵循 Vue 3 最佳实践

### 命名规范
- 页面：kebab-case（如 `my-exams.vue`）
- 组件：PascalCase（如 `VideoPlayer.vue`）
- 组合式函数：use 前缀（如 `useApi.ts`）
- 工具函数：camelCase（如 `formatScore.ts`）

### API 调用
```typescript
const api = useApi()

// GET 请求
const res = await api.get('/courses')

// POST 请求
const res = await api.post('/courses', { title: '...' })
```

### Toast 通知
```typescript
const toast = useToast()
toast.add({ title: '操作成功', color: 'green' })
```

## 构建部署

### 生产环境构建

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建产物位于 .output/ 目录
```

### 静态站点生成

```bash
# 生成静态站点（纯静态HTML，适合 CDN 部署）
npm run generate

# 静态文件位于 .output/public/ 目录
```

### 预览生产版本

```bash
# 本地预览生产构建
npm run preview
```

### 环境变量配置

```env
# .env 文件
NUXT_PUBLIC_API_BASE=https://api.yourdomain.com/api
```

### 项目打包

```bash
# 完整打包流程
npm ci                    # 安装依赖
npm run build             # 构建生产版本

# 打包产物
# .output/                 # 生产构建目录
# .output/server/          # 服务端代码
# .output/public/          # 静态资源
```

### Docker 打包

```bash
# 构建镜像
docker build -t renhotec-academy-web .

# 运行容器
docker run -d -p 3000:3000 --name web renhotec-academy-web

# 查看日志
docker logs -f web
```

### Docker Compose 部署

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 联系方式

- 项目负责人：Lucas Jay
- 邮箱：2434624535@qq.com
- 文档更新日期：2026-06-11
