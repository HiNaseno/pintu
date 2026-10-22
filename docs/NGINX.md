# Nginx 反向代理

`service/nginx-pintu.conf` 是配置模板。将 `__SERVER_NAME__` 换成自己控制或内部管理的主机名；将 `proxy_pass` 换成实际后端地址（默认 `127.0.0.1:5176`）。模板从 Nginx 的 `http` 上下文加载，合并配置时避免重复 default_server。

Node 可保持 `HOST=127.0.0.1`，访问仍须配置后端 `PINTU_ACCESS_CODE_HASH` 和用户实际打开的 `PINTU_ALLOWED_ORIGINS`。不使用通配来源。应用写请求使用会话 Cookie、Origin 和 `X-Pintu-CSRF`；代理必须原样保留这些头。

所有路径均转发给 Node，包括上传资料、缩略图、成品和下载。不得用 `root`、`alias`、缓存或静态文件服务直接映射 `runtime/`，否则会绕开浏览器作品隔离。未知 Host 返回 404；当前应用使用 HTTP 轮询，不开放 WebSocket 入口。

部署时先替换模板并检查：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

启用 HTTPS 后设置 `PINTU_COOKIE_SECURE=true`，并在允许来源中使用完整 `https://主机名`。HTTP 环境需要 false。浏览器从 IP 切换到主机名、端口变化或改用 HTTPS 后可能形成不同站点会话，请先保留原地址访问旧作品；不要通过修改任务编号迁移归属。

访问日志仅记录方法、状态、响应大小和耗时；不记录请求参数、正文、Cookie 或授权头。生产可根据实际证书与网络策略补充 TLS、日志轮转和访问控制。
