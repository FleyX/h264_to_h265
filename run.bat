@REM 核显解码，nv独显编码,平均码率2.5m
ffmpeg.exe -hwaccel cuda -c:v h264_cuvid -i ./Shameless.1080p.h264.s11e01.mkv -c:v hevc_nvenc -maxrate 2500K -c:a copy ./newShameless1.1080p.h264.s11e01.mkv