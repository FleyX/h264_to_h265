# h264-to-h265

使用 ffmpeg 将 264 视频转换为 h265 视频,支持 intel qsv 加速，nvdia cuda 加速。

选择文件夹后，会递归处理此文件夹，子文件夹中的视频也会被处理。

本人实测速度如下：

- qsv: 10 倍速(使用 uhd750)
- cuda: 16 倍速(使用 3060ti)

## 使用方法

前置条件：需要安装 ffmpeg，如需要硬件加速还要安装对应的显卡驱动。可参考[安装文档](https://juejin.cn/post/7034411980316213256)

### node 代码执行。支持 windows/linux

1. 安装 node 环境
2. 修改 index.js 中要处理文件夹路径。
3. 执行 node index.js 即可
