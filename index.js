const fs = require('fs-extra');
const path = require('path');

const cmd = require('child_process');

async function deal (basePath) {
	let fileList = fs.readdirSync(basePath);
	for (let i in fileList) {
		let name = fileList[i];
		if (!name.endsWith('.mkv') && !name.endsWith('.mp4')) {
			continue;
		}
		console.log("---------开始处理:" + name);
		let filePath = path.join(basePath, name);
		let res = JSON.parse(cmd.execSync(`ffprobe.exe "${filePath}" -show_streams -select_streams v -show_format  -print_format json`, { encoding: 'utf-8' }));
		if (!res.format || !res.streams || res.streams.length == 0) {
			console.log("无法识别的格式：" + JSON.stringify(res));
			continue;
		}
		let isH264 = res.streams.filter(item => item.codec_name === 'h264').length > 0;
		if (!isH264) {
			console.log("非h264,不处理");
			continue;
		}
		let bitRate = res.format.bit_rate;
		if (!bitRate) {
			console.log("未获取到帧率，不处理", JSON.stringify(res));
			continue;
		}
		bitRate = Math.round(parseInt(bitRate) / 1000);
		bitRate = bitRate > 2500 ? 2500 : bitRate;
		let newName;
		if (name.indexOf("h264") > -1) {
			newName = name.replace('h264', 'h265');
		} else if (name.indexOf('H264') > -1) {
			newName = name.replace('H264', 'H265');
		} else {
			let index = name.lastIndexOf('.');
			newName = name.substr(0, index) + ".h265" + name.substr(index);
		}
		let newFilePath = path.join(basePath, newName);
		let cmdStr = `ffmpeg.exe -hwaccel cuda -c:v h264_cuvid -i "${filePath}" -c:v hevc_nvenc -maxrate ${bitRate}K -c:a copy "${newFilePath}"`;
		console.log(cmdStr);
		let changeRes = cmd.execSync(cmdStr, { encoding: 'utf-8' });
		console.log(changeRes);
		if (!fs.existsSync(newFilePath)) {
			console.log("未知错误，文件转换失败");
			return;
		}
		//字幕，nfo文件重命名
		let namePart1 = name.substr(0, name.lastIndexOf('.'));
		let newNamePart1 = newName.substr(0, newName.lastIndexOf('.'));
		fileList.forEach(item => {
			if (item.startsWith(namePart1) && (item.endsWith('.nfo') || item.endsWith('.srt') || item.endsWith('.ass'))) {
				let temp = item.replace(namePart1, newNamePart1);
				if (item != temp) {
					fs.renameSync(path.join(basePath, item), path.join(basePath, temp));
				}
			}
		})
		fs.removeSync(filePath);
	}
}
(async () => {
	await deal("Z:/无耻之徒.Shameless.美版/season 09");
	await deal("Z:/无耻之徒.Shameless.美版/season 10");
	await deal("Z:/无耻之徒.Shameless.美版/season 11");
})();

