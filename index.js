const fs = require('fs-extra');
const path = require('path');

const cmd = require('child_process');
const hardTypeSet = new Set(["none", "qsv", "cuda"]);
const supportVideoTypeSet = new Set(["mkv", "mp4"]);
const replaceTextArr = ['h264', 'H264', 'x264', 'X264'];

/**
 * 
 * @param {*} basePath 处理路径
 * @param {int} maxBitRate 最大码率,默认2500
 * @param {boolean} changeName 是否改名（true会将h264，x264变更为h265,或者在文件结尾插入h265,其他名称相同额文件也会处理）
 * @param {*} hardType 硬件加速类型，空/none：不使用加速；qsv:使用intel核显qsv加速；cuda:使用nvdia cuda加速
 * @returns 
 */
async function deal (basePath, maxBitRate = 2500, changeName = false, hardType) {
	let hwType = hardType == 'qsv' ? "-hwaccel qsv" : hardType == 'cuda' ? "-hwaccel cuda" : "";
	let decodeType = hardType == 'qsv' ? "-c:v h264_qsv" : hardType == 'cuda' ? "-c:v h264_cuvid" : "";
	let encodeType = hardType == 'qsv' ? "-c:v hevc_qsv" : hardType == 'cuda' ? "-c:v hevc_nvenc" : "";

	if (hardType && !hardTypeSet.has(hardType)) {
		throw new Error("不支持的加速方案:" + hardType + ",仅支持:空," + JSON.stringify(hardTypeSet));
	}
	let fileList = fs.readdirSync(basePath);
	for (let i in fileList) {
		let name = fileList[i];
		let filePath = path.join(basePath, name);
		if (!fs.existsSync(filePath)) {
			continue;
		}
		if (fs.statSync(filePath).isDirectory()) {
			//如果为文件夹递归处理
			await deal(filePath, maxBitRate, changeName, hardType);
		}
		if (!supportVideoTypeSet.has(name.substring(name.lastIndexOf(".") + 1))) {
			continue;
		}
		console.log("---------开始处理:" + name);
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
		let is10Bit = res.streams.filter(item => item.bits_per_raw_sample === '10').length > 0;
		bitRate = Math.round(parseInt(bitRate) / 1000);
		bitRate = bitRate > maxBitRate * 2 ? maxBitRate : bitRate / 2;
		let newName = null;
		replaceTextArr.forEach(item => {
			if (newName == null && name.indexOf(item) > -1) {
				newName = name.replace(item, 'h265');
			}
		})
		if (newName == null) {
			let index = name.lastIndexOf('.');
			newName = name.substr(0, index) + ".h265" + name.substr(index);
		}
		let newFilePath = path.join(basePath, newName);
		let cmdStr = `ffmpeg.exe ${hwType} ${is10Bit ? "" : decodeType} -i "${filePath}" ${encodeType} -maxrate ${bitRate}K -c:a copy -y "${newFilePath}"`;
		console.log(cmdStr);
		let changeRes = cmd.execSync(cmdStr, { encoding: 'utf-8' });
		console.log(changeRes);
		if (!fs.existsSync(newFilePath)) {
			console.log("未知错误，文件转换失败");
			return;
		}
		if (changeName) {
			//字幕，nfo文件重命名
			let namePart1 = name.substr(0, name.lastIndexOf('.'));
			let newNamePart1 = newName.substr(0, newName.lastIndexOf('.'));
			fileList.forEach(item => {
				if (item.startsWith(namePart1) && item != name) {
					let temp = item.replace(namePart1, newNamePart1);
					if (item != temp) {
						fs.renameSync(path.join(basePath, item), path.join(basePath, temp));
					}
				}
			})
		}
		fs.removeSync(filePath);
		if (!changeName) {
			fs.moveSync(newFilePath, filePath);
		}
	}
}
(async () => {
	await deal("Z:\\userData\\视频\\剧集", 2500, true, "cuda");
})();

