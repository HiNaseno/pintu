# 本机意见反馈与管理

首页、工作台和案例页顶部提供“意见反馈”，结果卡片提供“反馈这张图”。支持分类、1–5 分评分、文字意见及三张截图（每张 5 MB）；关联任务需主动勾选。无需另外注册账号；先取得本地浏览器会话，内网共享环境先用访问口令解锁。Origin 和 X-Pintu-CSRF 校验仍生效。

反馈不访问模型服务，不执行生图。不会自动采集商品原图、提示词、Cookie、授权或日志。截图是用户主动上传的内容，应在提交前检查；保存时转换为 JPEG 并删除 EXIF 等元数据。

数据位于 `runtime/feedback/feedback.sqlite` 和 `runtime/feedback/screenshots/`。目录 0700，数据库及截图 0600；没有公开列表或管理页面。运行数据库不包含在源码发布包中。反馈默认保留，由管理员删除；备份整个 runtime 时同时备份这些文件及 SQLite WAL/SHM。

在项目根目录，以现有服务器运行账号执行：

```bash
npm run feedback:manage -- list
npm run feedback:manage -- list --type=material --status=pending --from=2026-10-01
npm run feedback:manage -- export --output=/受限目录/feedback-export
npm run feedback:manage -- status 反馈UUID processing
npm run feedback:manage -- status 反馈UUID resolved
npm run feedback:manage -- delete 反馈UUID --confirm-delete
```

自定义运行目录时，在命令前设置 `PINTU_RUNTIME_ROOT=/实际/runtime`。导出产生 `feedback.json` 与截图目录，请保留在受限位置，不放入 assets 或 Git。列表/导出最多取最新 1000 条，可按日期、类型和状态缩小范围。状态为 pending（待处理）、processing（处理中）、resolved（已解决）。

重复提交按会话与请求 ID 去重，相同 ID 不同内容拒绝；每个会话每天最多提交 20 条（UTC）。图片附件只允许实际可解码的 PNG、JPEG 和 WebP，最大 2000 万像素。用户只能读取属于自己的截图；管理员通过本机文件权限管理。
