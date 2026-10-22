# 开源发布检查清单

- 确认目标分支、版本和许可证；本版为 v0.3.0 / MIT。生产运行目录不得参与整理。
- 审查暂存文件及新增提交历史：仅包含源码、文档、模板与公开演示素材，不包含配置、密钥、会话、执行账本、用户图片和反馈内容。
- 核对 `.env.example`、Node 版本、锁文件、服务模板和文档链接，不写入真实地址、任务编号或运维记录。
- 在独立目录 `npm ci`，运行 `npm test`、`npm run test:release` 和 `git diff --check`；记录模拟测试和真实模型测试的边界。
- 检查未配置模型时的指引、内网访问口令、精确 Origin、跨浏览器资源隔离与未知任务防重复派发。
- 将审核完成的源码提交，再运行固定提交归档；工作区有未提交或未跟踪源码时构建应拒绝。

```bash
python3 scripts/prepare-release.py --commit HEAD --dry-run
python3 scripts/prepare-release.py --commit HEAD
cd assets/releases
sha256sum -c SHA256SUMS
```

输出仅包含该次的源码 ZIP、tar.gz、manifest 及这三项的 `SHA256SUMS`。扫描、清单和归档使用同一份提交字节；所有归档内文件均可按清单校验。默认不打包依赖。旧下载附件不会混入新的校验和。

归档验证后再由维护者决定推送或创建 GitHub Release。构建脚本本身不执行这些操作。发现曾泄露的真实凭据应在对应服务撤销，不能仅靠删除当前文件处理。
