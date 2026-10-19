var plugins_bb40132b_638b_4a9f_b028_d3fe47acc8d1 = 
{
    "init": function () {
		this._afterLoadResources = function () {
			// 本函数将在所有资源加载完毕后，游戏开启前被执行
		}
	},
    "drawLight": function () {

		// 绘制灯光/漆黑层效果。调用方式 core.plugin.drawLight(...)
		// 【参数说明】
		// name：必填，要绘制到的画布名；可以是一个系统画布，或者是个自定义画布；如果不存在则创建
		// color：可选，只能是一个0~1之间的数，为不透明度的值。不填则默认为0.9。
		// lights：可选，一个数组，定义了每个独立的灯光。
		//        其中每一项是三元组 [x,y,r] x和y分别为该灯光的横纵坐标，r为该灯光的半径。
		// lightDec：可选，0到1之间，光从多少百分比才开始衰减（在此范围内保持全亮），不设置默认为0。
		//        比如lightDec为0.5代表，每个灯光部分内圈50%的范围全亮，50%以后才开始快速衰减。
		// 【调用样例】
		// core.plugin.drawLight('curtain'); // 在curtain层绘制全图不透明度0.9，等价于更改画面色调为[0,0,0,0.9]。
		// core.plugin.drawLight('ui', 0.95, [[25,11,46]]); // 在ui层绘制全图不透明度0.95，其中在(25,11)点存在一个半径为46的灯光效果。
		// core.plugin.drawLight('test', 0.2, [[25,11,46,0.1]]); // 创建一个test图层，不透明度0.2，其中在(25,11)点存在一个半径为46的灯光效果，灯光中心不透明度0.1。
		// core.plugin.drawLight('test2', 0.9, [[25,11,46],[105,121,88],[301,221,106]]); // 创建test2图层，且存在三个灯光效果，分别是中心(25,11)半径46，中心(105,121)半径88，中心(301,221)半径106。
		// core.plugin.drawLight('xxx', 0.3, [[25,11,46],[105,121,88,0.2]], 0.4); // 存在两个灯光效果，它们在内圈40%范围内保持全亮，40%后才开始衰减。
		this.drawLight = function (name, color, lights, lightDec) {

			// 清空色调层；也可以修改成其它层比如animate/weather层，或者用自己创建的canvas
			var ctx = core.getContextByName(name);
			if (ctx == null) {
				if (typeof name == 'string')
					ctx = core.createCanvas(name, 0, 0, core._PX_ || core.__PIXELS__, core._PY_ || core.__PIXELS__, 98);
				else return;
			}

			ctx.mozImageSmoothingEnabled = false;
			ctx.webkitImageSmoothingEnabled = false;
			ctx.msImageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;

			core.clearMap(name);
			// 绘制色调层，默认不透明度
			if (color == null) color = 0.9;
			ctx.fillStyle = "rgba(0,0,0," + color + ")";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			lightDec = core.clamp(lightDec, 0, 1);

			// 绘制每个灯光效果
			ctx.globalCompositeOperation = 'destination-out';
			lights.forEach(function (light) {
				// 坐标，半径，中心不透明度
				var x = light[0],
					y = light[1],
					r = light[2];
				// 计算衰减距离
				var decDistance = parseInt(r * lightDec);
				// 正方形区域的直径和左上角坐标
				var grd = ctx.createRadialGradient(x, y, decDistance, x, y, r);
				grd.addColorStop(0, "rgba(0,0,0,1)");
				grd.addColorStop(1, "rgba(0,0,0,0)");
				ctx.beginPath();
				ctx.fillStyle = grd;
				ctx.arc(x, y, r, 0, 2 * Math.PI);
				ctx.fill();
			});
			ctx.globalCompositeOperation = 'source-over';
			// 可以在任何地方（如afterXXX或自定义脚本事件）调用函数，方法为  core.plugin.xxx();
		}
	},
    "shop": function () {
		// 【全局商店】相关的功能
		// 
		// 打开一个全局商店
		// shopId：要打开的商店id；noRoute：是否不计入录像
		this.openShop = function (shopId, noRoute) {
			var shop = core.status.shops[shopId];
			// Step 1: 检查能否打开此商店
			if (!this.canOpenShop(shopId)) {
				core.drawTip("该商店尚未开启");
				return false;
			}

			// Step 2: （如有必要）记录打开商店的脚本事件
			if (!noRoute) {
				core.status.route.push("shop:" + shopId);
			}

			// Step 3: 检查道具商店 or 公共事件
			if (shop.item) {
				if (core.openItemShop) {
					core.openItemShop(shopId);
				} else {
					core.playSound('操作失败');
					core.insertAction("道具商店插件不存在！请检查是否存在该插件！");
				}
				return;
			}
			if (shop.commonEvent) {
				core.insertCommonEvent(shop.commonEvent, shop.args);
				return;
			}

			_shouldProcessKeyUp = true;

			// Step 4: 执行标准公共商店    
			core.insertAction(this._convertShop(shop));
			return true;
		}

		////// 将一个全局商店转变成可预览的公共事件 //////
		this._convertShop = function (shop) {
			return [
				{ "type": "function", "function": "function() {core.addFlag('@temp@shop', 1);}" },
				{
					"type": "while",
					"condition": "true",
					"data": [
						// 检测能否访问该商店
						{
							"type": "if",
							"condition": "core.isShopVisited('" + shop.id + "')",
							"true": [
								// 可以访问，直接插入执行效果
								{ "type": "function", "function": "function() { core.plugin._convertShop_replaceChoices('" + shop.id + "', false) }" },
							],
							"false": [
								// 不能访问的情况下：检测能否预览
								{
									"type": "if",
									"condition": shop.disablePreview,
									"true": [
										// 不可预览，提示并退出
										{ "type": "playSound", "name": "操作失败" },
										"当前无法访问该商店！",
										{ "type": "break" },
									],
									"false": [
										// 可以预览：将商店全部内容进行替换
										{ "type": "tip", "text": "当前处于预览模式，不可购买" },
										{ "type": "function", "function": "function() { core.plugin._convertShop_replaceChoices('" + shop.id + "', true) }" },
									]
								}
							]
						}
					]
				},
				{ "type": "function", "function": "function() {core.addFlag('@temp@shop', -1);}" }
			];
		}

		this._convertShop_replaceChoices = function (shopId, previewMode) {
			var shop = core.status.shops[shopId];
			var choices = (shop.choices || []).filter(function (choice) {
				if (choice.condition == null || choice.condition == '') return true;
				try { return core.calValue(choice.condition); } catch (e) { return true; }
			}).map(function (choice) {
				var ableToBuy = core.calValue(choice.need);
				return {
					"text": choice.text,
					"icon": choice.icon,
					"color": ableToBuy && !previewMode ? choice.color : [153, 153, 153, 1],
					"action": ableToBuy && !previewMode ? [{ "type": "playSound", "name": "商店" }].concat(choice.action) : [
						{ "type": "playSound", "name": "操作失败" },
						{ "type": "tip", "text": previewMode ? "预览模式下不可购买" : "购买条件不足" }
					]
				};
			}).concat({ "text": "离开", "action": [{ "type": "playSound", "name": "取消" }, { "type": "break" }] });
			core.insertAction({ "type": "choices", "text": shop.text, "choices": choices });
		}

		/// 是否访问过某个快捷商店
		this.isShopVisited = function (id) {
			if (!core.hasFlag("__shops__")) core.setFlag("__shops__", {});
			var shops = core.getFlag("__shops__");
			if (!shops[id]) shops[id] = {};
			return shops[id].visited;
		}

		/// 当前应当显示的快捷商店列表
		this.listShopIds = function () {
			return Object.keys(core.status.shops).filter(function (id) {
				return core.isShopVisited(id) || !core.status.shops[id].mustEnable;
			});
		}

		/// 是否能够打开某个商店
		this.canOpenShop = function (id) {
			if (this.isShopVisited(id)) return true;
			var shop = core.status.shops[id];
			if (shop.item || shop.commonEvent || shop.mustEnable) return false;
			return true;
		}

		/// 启用或禁用某个快捷商店
		this.setShopVisited = function (id, visited) {
			if (!core.hasFlag("__shops__")) core.setFlag("__shops__", {});
			var shops = core.getFlag("__shops__");
			if (!shops[id]) shops[id] = {};
			if (visited) shops[id].visited = true;
			else delete shops[id].visited;
		}

		/// 能否使用快捷商店
		this.canUseQuickShop = function (id) {
			// 如果返回一个字符串，表示不能，字符串为不能使用的提示
			// 返回null代表可以使用

			// 检查当前楼层的canUseQuickShop选项是否为false
			if (core.status.thisMap.canUseQuickShop === false)
				return '当前楼层不能使用快捷商店。';
			return null;
		}

		var _shouldProcessKeyUp = true;

		/// 允许商店X键退出
		core.registerAction('keyUp', 'shops', function (keycode) {
			if (!core.status.lockControl || core.status.event.id != 'action') return false;
			if ((keycode == 13 || keycode == 32) && !_shouldProcessKeyUp) {
				_shouldProcessKeyUp = true;
				return true;
			}

			if (!core.hasFlag("@temp@shop") || core.status.event.data.type != 'choices') return false;
			var data = core.status.event.data.current;
			var choices = data.choices;
			var topIndex = core.actions._getChoicesTopIndex(choices.length);
			if (keycode == 88 || keycode == 27) { // X, ESC
				core.actions._clickAction(core._HALF_WIDTH_ || core.__HALF_SIZE__, topIndex + choices.length - 1);
				return true;
			}
			return false;
		}, 60);

		/// 允许长按空格或回车连续执行操作
		core.registerAction('keyDown', 'shops', function (keycode) {
			if (!core.status.lockControl || !core.hasFlag("@temp@shop") || core.status.event.id != 'action') return false;
			if (core.status.event.data.type != 'choices') return false;
			core.status.onShopLongDown = true;
			var data = core.status.event.data.current;
			var choices = data.choices;
			var topIndex = core.actions._getChoicesTopIndex(choices.length);
			if (keycode == 13 || keycode == 32) { // Space, Enter
				core.actions._clickAction(core._HALF_WIDTH_ || core.__HALF_SIZE__, topIndex + core.status.event.selection);
				_shouldProcessKeyUp = false;
				return true;
			}
			return false;
		}, 60);

		// 允许长按屏幕连续执行操作
		core.registerAction('longClick', 'shops', function (x, y, px, py) {
			if (!core.status.lockControl || !core.hasFlag("@temp@shop") || core.status.event.id != 'action') return false;
			if (core.status.event.data.type != 'choices') return false;
			var data = core.status.event.data.current;
			var choices = data.choices;
			var topIndex = core.actions._getChoicesTopIndex(choices.length);
			if (Math.abs(x - (core._HALF_WIDTH_ || core.__HALF_SIZE__)) <= 2 && y >= topIndex && y < topIndex + choices.length) {
				core.actions._clickAction(x, y);
				return true;
			}
			return false;
		}, 60);
	},
    "removeMap": function () {
		// 高层塔砍层插件，删除后不会存入存档，不可浏览地图也不可飞到。
		// 推荐用法：
		// 对于超高层或分区域塔，当在1区时将2区以后的地图删除；1区结束时恢复2区，进二区时删除1区地图，以此类推
		// 这样可以大幅减少存档空间，以及加快存读档速度

		// 删除楼层
		// core.removeMaps("MT1", "MT300") 删除MT1~MT300之间的全部层
		// core.removeMaps("MT10") 只删除MT10层
		this.removeMaps = function (fromId, toId) {
			toId = toId || fromId;
			var fromIndex = core.floorIds.indexOf(fromId),
				toIndex = core.floorIds.indexOf(toId);
			if (toIndex < 0) toIndex = core.floorIds.length - 1;
			flags.__visited__ = flags.__visited__ || {};
			flags.__removed__ = flags.__removed__ || [];
			flags.__disabled__ = flags.__disabled__ || {};
			flags.__leaveLoc__ = flags.__leaveLoc__ || {};
			for (var i = fromIndex; i <= toIndex; ++i) {
				var floorId = core.floorIds[i];
				if (core.status.maps[floorId].deleted) continue;
				delete flags.__visited__[floorId];
				flags.__removed__.push(floorId);
				delete flags.__disabled__[floorId];
				delete flags.__leaveLoc__[floorId];
				(core.status.autoEvents || []).forEach(function (event) {
					if (event.floorId == floorId && event.currentFloor) {
						core.autoEventExecuting(event.symbol, false);
						core.autoEventExecuted(event.symbol, false);
					}
				});
				core.status.maps[floorId].deleted = true;
				core.status.maps[floorId].canFlyTo = false;
				core.status.maps[floorId].canFlyFrom = false;
				core.status.maps[floorId].cannotViewMap = true;
			}
		}

		// 恢复楼层
		// core.resumeMaps("MT1", "MT300") 恢复MT1~MT300之间的全部层
		// core.resumeMaps("MT10") 只恢复MT10层
		this.resumeMaps = function (fromId, toId) {
			toId = toId || fromId;
			var fromIndex = core.floorIds.indexOf(fromId),
				toIndex = core.floorIds.indexOf(toId);
			if (toIndex < 0) toIndex = core.floorIds.length - 1;
			flags.__removed__ = flags.__removed__ || [];
			for (var i = fromIndex; i <= toIndex; ++i) {
				var floorId = core.floorIds[i];
				if (!core.status.maps[floorId].deleted) continue;
				flags.__removed__ = flags.__removed__.filter(function (f) { return f != floorId; });
				core.status.maps[floorId] = core.loadFloor(floorId);
			}
		}

		// 分区砍层相关
		var inAnyPartition = function (floorId) {
			var inPartition = false;
			(core.floorPartitions || []).forEach(function (floor) {
				var fromIndex = core.floorIds.indexOf(floor[0]);
				var toIndex = core.floorIds.indexOf(floor[1]);
				var index = core.floorIds.indexOf(floorId);
				if (fromIndex < 0 || index < 0) return;
				if (toIndex < 0) toIndex = core.floorIds.length - 1;
				if (index >= fromIndex && index <= toIndex) inPartition = true;
			});
			return inPartition;
		}

		// 分区砍层
		this.autoRemoveMaps = function (floorId) {
			if (main.mode != 'play' || !inAnyPartition(floorId)) return;
			// 根据分区信息自动砍层与恢复
			(core.floorPartitions || []).forEach(function (floor) {
				var fromIndex = core.floorIds.indexOf(floor[0]);
				var toIndex = core.floorIds.indexOf(floor[1]);
				var index = core.floorIds.indexOf(floorId);
				if (fromIndex < 0 || index < 0) return;
				if (toIndex < 0) toIndex = core.floorIds.length - 1;
				if (index >= fromIndex && index <= toIndex) {
					core.resumeMaps(core.floorIds[fromIndex], core.floorIds[toIndex]);
				} else {
					core.removeMaps(core.floorIds[fromIndex], core.floorIds[toIndex]);
				}
			});
		}
	},
    "fiveLayers": function () {
		// 是否启用五图层（增加背景2层和前景2层） 将__enable置为true即会启用；启用后请保存后刷新编辑器
		// 背景层2将会覆盖背景层 被事件层覆盖 前景层2将会覆盖前景层
		// 另外 请注意加入两个新图层 会让大地图的性能降低一些
		// 插件作者：ad
		var __enable = false;
		if (!__enable) return;

		// 创建新图层
		function createCanvas (name, zIndex) {
			if (!name) return;
			var canvas = document.createElement('canvas');
			canvas.id = name;
			canvas.className = 'gameCanvas anti-aliasing';
			// 编辑器模式下设置zIndex会导致加入的图层覆盖优先级过高
			if (main.mode != "editor") canvas.style.zIndex = zIndex || 0;
			// 将图层插入进游戏内容
			document.getElementById('gameDraw').appendChild(canvas);
			var ctx = canvas.getContext('2d');
			core.canvas[name] = ctx;
			canvas.width = core._PX_ || core.__PIXELS__;
			canvas.height = core._PY_ || core.__PIXELS__;
			return canvas;
		}

		var bg2Canvas = createCanvas('bg2', 20);
		var fg2Canvas = createCanvas('fg2', 63);
		// 大地图适配
		core.bigmap.canvas = ["bg2", "fg2", "bg", "event", "event2", "fg", "damage"];
		core.initStatus.bg2maps = {};
		core.initStatus.fg2maps = {};

		if (main.mode == 'editor') {
			/*插入编辑器的图层 不做此步新增图层无法在编辑器显示*/
			// 编辑器图层覆盖优先级 eui > efg > fg(前景层) > event2(48*32图块的事件层) > event(事件层) > bg(背景层)
			// 背景层2(bg2) 插入事件层(event)之前(即bg与event之间)
			document.getElementById('mapEdit').insertBefore(bg2Canvas, document.getElementById('event'));
			// 前景层2(fg2) 插入编辑器前景(efg)之前(即fg之后)
			document.getElementById('mapEdit').insertBefore(fg2Canvas, document.getElementById('ebm'));
			// 原本有三个图层 从4开始添加
			var num = 4;
			// 新增图层存入editor.dom中
			editor.dom.bg2c = core.canvas.bg2.canvas;
			editor.dom.bg2Ctx = core.canvas.bg2;
			editor.dom.fg2c = core.canvas.fg2.canvas;
			editor.dom.fg2Ctx = core.canvas.fg2;
			editor.dom.maps.push('bg2map', 'fg2map');
			editor.dom.canvas.push('bg2', 'fg2');

			// 创建编辑器上的按钮
			var createCanvasBtn = function (name) {
				// 电脑端创建按钮
				var input = document.createElement('input');
				// layerMod4/layerMod5
				var id = 'layerMod' + num++;
				// bg2map/fg2map
				var value = name + 'map';
				input.type = 'radio';
				input.name = 'layerMod';
				input.id = id;
				input.value = value;
				editor.dom[id] = input;
				input.onchange = function () {
					editor.uifunctions.setLayerMod(value);
				}
				return input;
			};

			var createCanvasBtn_mobile = function (name) {
				// 手机端往选择列表中添加子选项
				var input = document.createElement('option');
				var id = 'layerMod' + num++;
				var value = name + 'map';
				input.name = 'layerMod';
				input.value = value;
				editor.dom[id] = input;
				return input;
			};
			if (!editor.isMobile) {
				var input = createCanvasBtn('bg2');
				var input2 = createCanvasBtn('fg2');
				// 获取事件层及其父节点
				var child = document.getElementById('layerMod'),
					parent = child.parentNode;
				// 背景层2插入事件层前
				parent.insertBefore(input, child);
				// 不能直接更改背景层2的innerText 所以创建文本节点
				var txt = document.createTextNode('bg2');
				// 插入事件层前(即新插入的背景层2前)
				parent.insertBefore(txt, child);
				// 向最后插入前景层2(即插入前景层后)
				parent.appendChild(input2);
				var txt2 = document.createTextNode('fg2');
				parent.appendChild(txt2);
				parent.childNodes[2].replaceWith("bg");
				parent.childNodes[6].replaceWith("事件");
				parent.childNodes[8].replaceWith("fg");
			} else {
				var input = createCanvasBtn_mobile('bg2');
				var input2 = createCanvasBtn_mobile('fg2');
				// 手机端因为是选项 所以可以直接改innerText
				input.innerText = '背景层2';
				input2.innerText = '前景层2';
				var parent = document.getElementById('layerMod');
				parent.insertBefore(input, parent.children[1]);
				parent.appendChild(input2);
			}
		}

		var _loadFloor_doNotCopy = core.maps._loadFloor_doNotCopy;
		core.maps._loadFloor_doNotCopy = function () {
			return ["bg2map", "fg2map"].concat(_loadFloor_doNotCopy());
		}
		////// 绘制背景和前景层 //////
		core.maps._drawBg_draw = function (floorId, toDrawCtx, cacheCtx, config) {
			config.ctx = cacheCtx;
			core.maps._drawBg_drawBackground(floorId, config);
			// ------ 调整这两行的顺序来控制是先绘制贴图还是先绘制背景图块；后绘制的覆盖先绘制的。
			core.maps._drawFloorImages(floorId, config.ctx, 'bg', null, null, config.onMap);
			core.maps._drawBgFgMap(floorId, 'bg', config);
			if (config.onMap) {
				core.drawImage(toDrawCtx, cacheCtx.canvas, core.bigmap.v2 ? -32 : 0, core.bigmap.v2 ? -32 : 0);
				core.clearMap('bg2');
				core.clearMap(cacheCtx);
			}
			core.maps._drawBgFgMap(floorId, 'bg2', config);
			if (config.onMap) core.drawImage('bg2', cacheCtx.canvas, core.bigmap.v2 ? -32 : 0, core.bigmap.v2 ? -32 : 0);
			config.ctx = toDrawCtx;
		}
		core.maps._drawFg_draw = function (floorId, toDrawCtx, cacheCtx, config) {
			config.ctx = cacheCtx;
			// ------ 调整这两行的顺序来控制是先绘制贴图还是先绘制前景图块；后绘制的覆盖先绘制的。
			core.maps._drawFloorImages(floorId, config.ctx, 'fg', null, null, config.onMap);
			core.maps._drawBgFgMap(floorId, 'fg', config);
			if (config.onMap) {
				core.drawImage(toDrawCtx, cacheCtx.canvas, core.bigmap.v2 ? -32 : 0, core.bigmap.v2 ? -32 : 0);
				core.clearMap('fg2');
				core.clearMap(cacheCtx);
			}
			core.maps._drawBgFgMap(floorId, 'fg2', config);
			if (config.onMap) core.drawImage('fg2', cacheCtx.canvas, core.bigmap.v2 ? -32 : 0, core.bigmap.v2 ? -32 : 0);
			config.ctx = toDrawCtx;
		}
		////// 移动判定 //////
		core.maps._generateMovableArray_arrays = function (floorId) {
			return {
				bgArray: this.getBgMapArray(floorId),
				fgArray: this.getFgMapArray(floorId),
				eventArray: this.getMapArray(floorId),
				bg2Array: this._getBgFgMapArray('bg2', floorId),
				fg2Array: this._getBgFgMapArray('fg2', floorId)
			};
		}
	},
    "itemShop": function () {
		// 道具商店相关的插件
		// 可在全塔属性-全局商店中使用「道具商店」事件块进行编辑（如果找不到可以在入口方块中找）

		var shopId = null; // 当前商店ID
		var type = 0; // 当前正在选中的类型，0买入1卖出
		var selectItem = 0; // 当前正在选中的道具
		var selectCount = 0; // 当前已经选中的数量
		var page = 0;
		var totalPage = 0;
		var totalMoney = 0;
		var list = [];
		var shopInfo = null; // 商店信息
		var choices = []; // 商店选项
		var use = 'money';
		var useText = '金币';

		var bigFont = core.ui._buildFont(20, false),
			middleFont = core.ui._buildFont(18, false);

		this._drawItemShop = function () {
			// 绘制道具商店

			// Step 1: 背景和固定的几个文字
			core.ui._createUIEvent();
			core.clearMap('uievent');
			core.ui.clearUIEventSelector();
			core.setTextAlign('uievent', 'left');
			core.setTextBaseline('uievent', 'top');
			core.fillRect('uievent', 0, 0, 416, 416, 'black');
			core.drawWindowSkin('winskin.png', 'uievent', 0, 0, 416, 56);
			core.drawWindowSkin('winskin.png', 'uievent', 0, 56, 312, 56);
			core.drawWindowSkin('winskin.png', 'uievent', 0, 112, 312, 304);
			core.drawWindowSkin('winskin.png', 'uievent', 312, 56, 104, 56);
			core.drawWindowSkin('winskin.png', 'uievent', 312, 112, 104, 304);
			core.setFillStyle('uievent', 'white');
			core.setStrokeStyle('uievent', 'white');
			core.fillText("uievent", "购买", 32, 74, 'white', bigFont);
			core.fillText("uievent", "卖出", 132, 74);
			core.fillText("uievent", "离开", 232, 74);
			core.fillText("uievent", "当前" + useText, 324, 66, null, middleFont);
			core.setTextAlign("uievent", "right");
			core.fillText("uievent", core.formatBigNumber(core.status.hero[use]), 405, 89);
			core.setTextAlign("uievent", "left");
			core.ui.drawUIEventSelector(1, "winskin.png", 22 + 100 * type, 66, 60, 33);
			if (selectItem != null) {
				core.setTextAlign('uievent', 'center');
				core.fillText("uievent", type == 0 ? "买入个数" : "卖出个数", 364, 320, null, bigFont);
				core.fillText("uievent", "<   " + selectCount + "   >", 364, 350);
				core.fillText("uievent", "确定", 364, 380);
			}

			// Step 2：获得列表并展示
			list = choices.filter(function (one) {
				if (one.condition != null && one.condition != '') {
					try { if (!core.calValue(one.condition)) return false; } catch (e) { }
				}
				return (type == 0 && one.money != null) || (type == 1 && one.sell != null);
			});
			var per_page = 6;
			totalPage = Math.ceil(list.length / per_page);
			page = Math.floor((selectItem || 0) / per_page) + 1;

			// 绘制分页
			if (totalPage > 1) {
				var half = 156;
				core.setTextAlign('uievent', 'center');
				core.fillText('uievent', page + " / " + totalPage, half, 388, null, middleFont);
				if (page > 1) core.fillText('uievent', '上一页', half - 80, 388);
				if (page < totalPage) core.fillText('uievent', '下一页', half + 80, 388);
			}
			core.setTextAlign('uievent', 'left');

			// 绘制每一项
			var start = (page - 1) * per_page;
			for (var i = 0; i < per_page; ++i) {
				var curr = start + i;
				if (curr >= list.length) break;
				var item = list[curr];
				core.drawIcon('uievent', item.id, 10, 125 + i * 40);
				core.setTextAlign('uievent', 'left');
				core.fillText('uievent', core.material.items[item.id].name, 50, 132 + i * 40, null, bigFont);
				core.setTextAlign('uievent', 'right');
				core.fillText('uievent', (type == 0 ? core.calValue(item.money) : core.calValue(item.sell)) + useText + "/个", 300, 133 + i * 40, null, middleFont);
				core.setTextAlign("uievent", "left");
				if (curr == selectItem) {
					// 绘制描述，文字自动放缩
					var text = core.material.items[item.id].text || "该道具暂无描述";
					try { text = core.replaceText(text); } catch (e) { }
					for (var fontSize = 20; fontSize >= 8; fontSize -= 2) {
						var config = { left: 10, fontSize: fontSize, maxWidth: 403 };
						var height = core.getTextContentHeight(text, config);
						if (height <= 50) {
							config.top = (56 - height) / 2;
							core.drawTextContent("uievent", text, config);
							break;
						}
					}
					core.ui.drawUIEventSelector(2, "winskin.png", 8, 120 + i * 40, 295, 40);
					if (type == 0 && item.number != null) {
						core.fillText("uievent", "存货", 324, 132, null, bigFont);
						core.setTextAlign("uievent", "right");
						core.fillText("uievent", item.number, 406, 132, null, null, 40);
					} else if (type == 1) {
						core.fillText("uievent", "数量", 324, 132, null, bigFont);
						core.setTextAlign("uievent", "right");
						core.fillText("uievent", core.itemCount(item.id), 406, 132, null, null, 40);
					}
					core.setTextAlign("uievent", "left");
					core.fillText("uievent", "预计" + useText, 324, 250);
					core.setTextAlign("uievent", "right");
					totalMoney = selectCount * (type == 0 ? core.calValue(item.money) : core.calValue(item.sell));
					core.fillText("uievent", core.formatBigNumber(totalMoney), 405, 280);

					core.setTextAlign("uievent", "left");
					core.fillText("uievent", type == 0 ? "已购次数" : "已卖次数", 324, 170);
					core.setTextAlign("uievent", "right");
					core.fillText("uievent", (type == 0 ? item.money_count : item.sell_count) || 0, 405, 200);
				}
			}

			core.setTextAlign('uievent', 'left');
			core.setTextBaseline('uievent', 'alphabetic');
		}

		var _add = function (item, delta) {
			if (item == null) return;
			selectCount = core.clamp(
				selectCount + delta, 0,
				Math.min(type == 0 ? Math.floor(core.status.hero[use] / core.calValue(item.money)) : core.itemCount(item.id),
					type == 0 && item.number != null ? item.number : Number.MAX_SAFE_INTEGER)
			);
		}

		var _confirm = function (item) {
			if (item == null || selectCount == 0) return;
			if (type == 0) {
				core.status.hero[use] -= totalMoney;
				core.getItem(item.id, selectCount);
				core.stopSound();
				core.playSound('确定');
				if (item.number != null) item.number -= selectCount;
				item.money_count = (item.money_count || 0) + selectCount;
			} else {
				core.status.hero[use] += totalMoney;
				core.removeItem(item.id, selectCount);
				core.playSound('确定');
				core.drawTip("成功卖出" + selectCount + "个" + core.material.items[item.id].name, item.id);
				if (item.number != null) item.number += selectCount;
				item.sell_count = (item.sell_count || 0) + selectCount;
			}
			selectCount = 0;
		}

		this._performItemShopKeyBoard = function (keycode) {
			var item = list[selectItem] || null;
			// 键盘操作
			switch (keycode) {
				case 38: // up
					if (selectItem == null) break;
					if (selectItem == 0) selectItem = null;
					else selectItem--;
					selectCount = 0;
					break;
				case 37: // left
					if (selectItem == null) {
						if (type > 0) type--;
						break;
					}
					_add(item, -1);
					break;
				case 39: // right
					if (selectItem == null) {
						if (type < 2) type++;
						break;
					}
					_add(item, 1);
					break;
				case 40: // down
					if (selectItem == null) {
						if (list.length > 0) selectItem = 0;
						break;
					}
					if (list.length == 0) break;
					selectItem = Math.min(selectItem + 1, list.length - 1);
					selectCount = 0;
					break;
				case 13:
				case 32: // Enter/Space
					if (selectItem == null) {
						if (type == 2)
							core.insertAction({ "type": "break" });
						else if (list.length > 0)
							selectItem = 0;
						break;
					}
					_confirm(item);
					break;
				case 27: // ESC
					if (selectItem == null) {
						core.insertAction({ "type": "break" });
						break;
					}
					selectItem = null;
					break;
			}
		}

		this._performItemShopClick = function (px, py) {
			var item = list[selectItem] || null;
			// 鼠标操作
			if (px >= 22 && px <= 82 && py >= 71 && py <= 102) {
				// 买
				if (type != 0) {
					type = 0;
					selectItem = null;
					selectCount = 0;
				}
				return;
			}
			if (px >= 122 && px <= 182 && py >= 71 && py <= 102) {
				// 卖
				if (type != 1) {
					type = 1;
					selectItem = null;
					selectCount = 0;
				}
				return;
			}
			if (px >= 222 && px <= 282 && py >= 71 && py <= 102) // 离开
				return core.insertAction({ "type": "break" });
			// < >
			if (px >= 318 && px <= 341 && py >= 348 && py <= 376)
				return _add(item, -1);
			if (px >= 388 && px <= 416 && py >= 348 && py <= 376)
				return _add(item, 1);
			// 确定
			if (px >= 341 && px <= 387 && py >= 380 && py <= 407)
				return _confirm(item);

			// 上一页/下一页
			if (px >= 45 && px <= 105 && py >= 388) {
				if (page > 1) {
					selectItem -= 6;
					selectCount = 0;
				}
				return;
			}
			if (px >= 208 && px <= 268 && py >= 388) {
				if (page < totalPage) {
					selectItem = Math.min(selectItem + 6, list.length - 1);
					selectCount = 0;
				}
				return;
			}

			// 实际区域
			if (px >= 9 && px <= 300 && py >= 120 && py < 360) {
				if (list.length == 0) return;
				var index = parseInt((py - 120) / 40);
				var newItem = 6 * (page - 1) + index;
				if (newItem >= list.length) newItem = list.length - 1;
				if (newItem != selectItem) {
					selectItem = newItem;
					selectCount = 0;
				}
				return;
			}
		}

		this._performItemShopAction = function () {
			if (flags.type == 0) return this._performItemShopKeyBoard(flags.keycode);
			else return this._performItemShopClick(flags.px, flags.py);
		}

		this.openItemShop = function (itemShopId) {
			shopId = itemShopId;
			type = 0;
			page = 0;
			selectItem = null;
			selectCount = 0;
			core.isShopVisited(itemShopId);
			shopInfo = flags.__shops__[shopId];
			if (shopInfo.choices == null) shopInfo.choices = core.clone(core.status.shops[shopId].choices);
			choices = shopInfo.choices;
			use = core.status.shops[shopId].use;
			if (use != 'exp') use = 'money';
			useText = use == 'money' ? '金币' : '经验';

			core.insertAction([{
				"type": "while",
				"condition": "true",
				"data": [
					{ "type": "function", "function": "function () { core.plugin._drawItemShop(); }" },
					{ "type": "wait" },
					{ "type": "function", "function": "function() { core.plugin._performItemShopAction(); }" }
				]
			},
			{
				"type": "function",
				"function": "function () { core.deleteCanvas('uievent'); core.ui.clearUIEventSelector(); }"
			}
			]);
		}

	},
    "enemyLevel": function () {
		// 此插件将提供怪物手册中的怪物境界显示
		// 使用此插件需要先给每个怪物定义境界，方法如下：
		// 点击怪物的【配置表格】，找到“【怪物】相关的表格配置”，然后在【名称】仿照增加境界定义：
		/*
		 "level": {
			  "_leaf": true,
			  "_type": "textarea",
			  "_string": true,
			  "_data": "境界"
		 },
		 */
		// 然后保存刷新，可以看到怪物的属性定义中出现了【境界】。再开启本插件即可。

		// 是否开启本插件，默认禁用；将此改成 true 将启用本插件。
		var __enable = false;
		if (!__enable) return;

		// 这里定义每个境界的显示颜色；可以写'red', '#RRGGBB' 或者[r,g,b,a]四元数组
		var levelToColors = {
			"萌新一阶": "red",
			"萌新二阶": "#FF0000",
			"萌新三阶": [255, 0, 0, 1],
		};

		// 复写 _drawBook_drawName
		var originDrawBook = core.ui._drawBook_drawName;
		core.ui._drawBook_drawName = function (index, enemy, top, left, width) {
			// 如果没有境界，则直接调用原始代码绘制
			if (!enemy.level) return originDrawBook.call(core.ui, index, enemy, top, left, width);
			// 存在境界，则额外进行绘制
			core.setTextAlign('ui', 'center');
			if (enemy.specialText.length == 0) {
				core.fillText('ui', enemy.name, left + width / 2,
					top + 27, '#DDDDDD', this._buildFont(17, true));
				core.fillText('ui', enemy.level, left + width / 2,
					top + 51, core.arrayToRGBA(levelToColors[enemy.level] || '#DDDDDD'), this._buildFont(14, true));
			} else {
				core.fillText('ui', enemy.name, left + width / 2,
					top + 20, '#DDDDDD', this._buildFont(17, true), width);
				switch (enemy.specialText.length) {
					case 1:
						core.fillText('ui', enemy.specialText[0], left + width / 2,
							top + 38, core.arrayToRGBA((enemy.specialColor || [])[0] || '#FF6A6A'),
							this._buildFont(14, true), width);
						break;
					case 2:
						// Step 1: 计算字体
						var text = enemy.specialText[0] + "  " + enemy.specialText[1];
						core.setFontForMaxWidth('ui', text, width, this._buildFont(14, true));
						// Step 2: 计算总宽度
						var totalWidth = core.calWidth('ui', text);
						var leftWidth = core.calWidth('ui', enemy.specialText[0]);
						var rightWidth = core.calWidth('ui', enemy.specialText[1]);
						// Step 3: 绘制
						core.fillText('ui', enemy.specialText[0], left + (width + leftWidth - totalWidth) / 2,
							top + 38, core.arrayToRGBA((enemy.specialColor || [])[0] || '#FF6A6A'));
						core.fillText('ui', enemy.specialText[1], left + (width + totalWidth - rightWidth) / 2,
							top + 38, core.arrayToRGBA((enemy.specialColor || [])[1] || '#FF6A6A'));
						break;
					default:
						core.fillText('ui', '多属性...', left + width / 2,
							top + 38, '#FF6A6A', this._buildFont(14, true), width);
				}
				core.fillText('ui', enemy.level, left + width / 2,
					top + 56, core.arrayToRGBA(levelToColors[enemy.level] || '#DDDDDD'), this._buildFont(14, true));
			}
		}

		// 也可以复写其他的属性颜色如怪物攻防等，具体参见下面的例子的注释部分
		core.ui._drawBook_drawRow1 = function (index, enemy, top, left, width, position) {
			// 绘制第一行
			core.setTextAlign('ui', 'left');
			var b13 = this._buildFont(13, true),
				f13 = this._buildFont(13, false);
			var col1 = left,
				col2 = left + width * 9 / 25,
				col3 = left + width * 17 / 25;
			core.fillText('ui', '生命', col1, position, '#DDDDDD', f13);
			core.fillText('ui', core.formatBigNumber(enemy.hp || 0), col1 + 30, position, /*'red' */ null, b13);
			core.fillText('ui', '攻击', col2, position, null, f13);
			core.fillText('ui', core.formatBigNumber(enemy.atk || 0), col2 + 30, position, /* '#FF0000' */ null, b13);
			core.fillText('ui', '防御', col3, position, null, f13);
			core.fillText('ui', core.formatBigNumber(enemy.def || 0), col3 + 30, position, /* [255, 0, 0, 1] */ null, b13);
		}
	},
    "multiHeros": function () {
		// 多角色插件
		// Step 1: 启用本插件
		// Step 2: 定义每个新的角色各项初始数据（参见下方注释）
		// Step 3: 在游戏中的任何地方都可以调用 `core.changeHero()` 进行切换；也可以 `core.changeHero(1)` 来切换到某个具体的角色上

		// 是否开启本插件，默认禁用；将此改成 true 将启用本插件。
		var __enable = false;
		if (!__enable) return;

		// 在这里定义全部的新角色属性
		// 请注意，在这里定义的内容不会多角色共用，在切换时会进行恢复。
		// 你也可以自行新增或删除，比如不共用金币则可以加上"money"的初始化，不共用道具则可以加上"items"的初始化，
		// 多角色共用hp的话则删除hp，等等。总之，不共用的属性都在这里进行定义就好。
		var hero1 = {
			"floorId": "MT0", // 该角色初始楼层ID；如果共用楼层可以注释此项
			"image": "brave.png", // 角色的行走图名称；此项必填不然会报错
			"name": "1号角色",
			"lv": 1,
			"hp": 10000, // 如果HP共用可注释此项
			"atk": 1000,
			"def": 1000,
			"mdef": 0,
			// "money": 0, // 如果要不共用金币则取消此项注释
			// "exp": 0, // 如果要不共用经验则取消此项注释
			"loc": { "x": 0, "y": 0, "direction": "up" }, // 该角色初始位置；如果共用位置可注释此项
			"items": {
				"tools": {}, // 如果共用消耗道具（含钥匙）则可注释此项
				// "constants": {}, // 如果不共用永久道具（如手册）可取消注释此项
				"equips": {}, // 如果共用在背包的装备可注释此项
			},
			"equipment": [], // 如果共用装备可注释此项；此项和上面的「共用在背包的装备」需要拥有相同状态，不然可能出现问题
		};
		// 也可以类似新增其他角色
		// 新增的角色，各项属性共用与不共用的选择必须和上面完全相同，否则可能出现问题。
		// var hero2 = { ...

		var heroCount = 2; // 包含默认角色在内总共多少个角色，该值需手动修改。

		this.initHeros = function () {
			core.setFlag("hero1", core.clone(hero1)); // 将属性值存到变量中
			// core.setFlag("hero2", core.clone(hero2)); // 更多的角色也存入变量中；每个定义的角色都需要新增一行

			// 检测是否存在装备
			if (hero1.equipment) {
				if (!hero1.items || !hero1.items.equips) {
					alert('多角色插件的equipment和道具中的equips必须拥有相同状态！');
				}
				// 存99号套装为全空
				var saveEquips = core.getFlag("saveEquips", []);
				saveEquips[99] = [];
				core.setFlag("saveEquips", saveEquips);
			} else {
				if (hero1.items && hero1.items.equips) {
					alert('多角色插件的equipment和道具中的equips必须拥有相同状态！');
				}
			}
		}

		// 在游戏开始注入initHeros
		var _startGame_setHard = core.events._startGame_setHard;
		core.events._startGame_setHard = function () {
			_startGame_setHard.call(core.events);
			core.initHeros();
		}

		// 切换角色
		// 可以使用 core.changeHero() 来切换到下一个角色
		// 也可以 core.changeHero(1) 来切换到某个角色（默认角色为0）
		this.changeHero = function (toHeroId) {
			var currHeroId = core.getFlag("heroId", 0); // 获得当前角色ID
			if (toHeroId == null) {
				toHeroId = (currHeroId + 1) % heroCount;
			}
			if (currHeroId == toHeroId) return;

			var saveList = Object.keys(hero1);

			// 保存当前内容
			var toSave = {};
			// 暂时干掉 drawTip 和 音效，避免切装时的提示
			var _drawTip = core.ui.drawTip;
			core.ui.drawTip = function () { };
			var _playSound = core.control.playSound;
			core.control.playSound = function () { }
			// 记录当前录像，因为可能存在换装问题
			core.clearRouteFolding();
			var routeLength = core.status.route.length;
			// 优先判定装备
			if (hero1.equipment) {
				core.items.quickSaveEquip(100 + currHeroId);
				core.items.quickLoadEquip(99);
			}

			saveList.forEach(function (name) {
				if (name == 'floorId') toSave[name] = core.status.floorId; // 楼层单独设置
				else if (name == 'items') {
					toSave.items = core.clone(core.status.hero.items);
					Object.keys(toSave.items).forEach(function (one) {
						if (!hero1.items[one]) delete toSave.items[one];
					});
				} else toSave[name] = core.clone(core.status.hero[name]); // 使用core.clone()来创建新对象
			});

			core.setFlag("hero" + currHeroId, toSave); // 将当前角色信息进行保存
			var data = core.getFlag("hero" + toHeroId); // 获得要切换的角色保存内容

			// 设置角色的属性值
			saveList.forEach(function (name) {
				if (name == "floorId");
				else if (name == "items") {
					Object.keys(core.status.hero.items).forEach(function (one) {
						if (data.items[one]) core.status.hero.items[one] = core.clone(data.items[one]);
					});
				} else {
					core.status.hero[name] = core.clone(data[name]);
				}
			});
			// 最后装上装备
			if (hero1.equipment) {
				core.items.quickLoadEquip(100 + toHeroId);
			}

			core.ui.drawTip = _drawTip;
			core.control.playSound = _playSound;
			core.status.route = core.status.route.slice(0, routeLength);
			core.control._bindRoutePush();

			// 插入事件：改变角色行走图并进行楼层切换
			var toFloorId = data.floorId || core.status.floorId;
			var toLoc = data.loc || core.status.hero.loc;
			core.insertAction([
				{ "type": "setHeroIcon", "name": data.image || "hero.png" }, // 改变行走图
				// 同层则用changePos，不同层则用changeFloor；这是为了避免共用楼层造成触发eachArrive
				toFloorId != core.status.floorId ? {
					"type": "changeFloor",
					"floorId": toFloorId,
					"loc": [toLoc.x, toLoc.y],
					"direction": toLoc.direction,
					"time": 0 // 可以在这里设置切换时间
				} : { "type": "changePos", "loc": [toLoc.x, toLoc.y], "direction": toLoc.direction }
				// 你还可以在这里执行其他事件，比如增加或取消跟随效果
			]);
			core.setFlag("heroId", toHeroId); // 保存切换到的角色ID
		}
	},
    "heroFourFrames": function () {
		// 样板的勇士/跟随者移动时只使用2、4两帧，观感较差。本插件可以将四帧全用上。

		// 是否启用本插件
		var __enable = true;
		if (!__enable) return;

		["up", "down", "left", "right"].forEach(function (one) {
			// 指定中间帧动画
			core.material.icons.hero[one].midFoot = 2;
		});

		var heroMoving = function (timestamp) {
			if (core.status.heroMoving <= 0) return;
			if (timestamp - core.animateFrame.moveTime > core.values.moveSpeed) {
				core.animateFrame.leftLeg++;
				core.animateFrame.moveTime = timestamp;
			}
			core.drawHero(['stop', 'leftFoot', 'midFoot', 'rightFoot'][core.animateFrame.leftLeg % 4], 4 * core.status.heroMoving);
		}
		core.registerAnimationFrame('heroMoving', true, heroMoving);

		core.events._eventMoveHero_moving = function (step, moveSteps) {
			var curr = moveSteps[0];
			var direction = curr[0], x = core.getHeroLoc('x'), y = core.getHeroLoc('y');
			// ------ 前进/后退
			var o = direction == 'backward' ? -1 : 1;
			if (direction == 'forward' || direction == 'backward') direction = core.getHeroLoc('direction');
			var faceDirection = direction;
			if (direction == 'leftup' || direction == 'leftdown') faceDirection = 'left';
			if (direction == 'rightup' || direction == 'rightdown') faceDirection = 'right';
			core.setHeroLoc('direction', direction);
			if (curr[1] <= 0) {
				core.setHeroLoc('direction', faceDirection);
				moveSteps.shift();
				return true;
			}
			if (step <= 4) core.drawHero('stop', 4 * o * step);
			else if (step <= 8) core.drawHero('leftFoot', 4 * o * step);
			else if (step <= 12) core.drawHero('midFoot', 4 * o * (step - 8));
			else if (step <= 16) core.drawHero('rightFoot', 4 * o * (step - 8)); // if (step == 8) {
			if (step == 8 || step == 16) {
				core.setHeroLoc('x', x + o * core.utils.scan2[direction].x, true);
				core.setHeroLoc('y', y + o * core.utils.scan2[direction].y, true);
				core.updateFollowers();
				curr[1]--;
				if (curr[1] <= 0) moveSteps.shift();
				core.setHeroLoc('direction', faceDirection);
				return step == 16;
			}
			return false;
		}
	},
    "routeFixing": function () {
		// 是否开启本插件，true 表示启用，false 表示禁用。
		var __enable = true;
		if (!__enable) return;
		/*
		 使用说明：启用本插件后，录像回放时您可以用数字键1或6分别切换到原速或24倍速，
		 暂停播放时按数字键7（电脑按N）可以单步播放。（手机端可以点击难度单词切换出数字键）
		 数字键2-5可以进行录像自助精修，具体描述见下（实际弹窗请求您输入时不要带有任何空格）：
		 
		 up down left right 勇士向某个方向「行走一步或撞击」
		 item:ID 使用某件道具，如 item:bomb 表示使用炸弹
		 unEquip:n 卸掉身上第(n+1)件装备（n从0开始），如 unEquip:1 默认表示卸掉盾牌
		 equip:ID 穿上某件装备，如 equip:sword1 表示装上铁剑
		 saveEquip:n 将身上的当前套装保存到第n套快捷套装（n从0开始）
		 loadEquip:n 快捷换上之前保存好的第n套套装
		 fly:ID 使用楼传飞到某一层，如 fly:MT10 表示飞到主塔10层
		 choices:none 确认框/选择项「超时」（作者未设置超时时间则此项视为缺失）
		 choices:n 确认框/选择项选择第(n+1)项（选择项n从0开始，确认框n为0表示「确定」，1表示「取消」）
		 选择项n为负数时表示选择倒数第 -n 项，如 -1 表示最后一项（V2.8.2起标准全局商店的「离开」项）
		 此项缺失的话，确认框将选择作者指定的默认项（初始光标位置），选择项将弹窗请求补选（后台录像验证中选最后一项，可以复写函数来修改）
		 shop:ID 打开某个全局商店，如 shop:itemShop 表示打开道具商店。因此连载塔千万不要中途修改商店ID！
		 turn 单击勇士（Z键）转身，core.turnHero() 会产生此项，因此通过事件等方式强制让勇士转向应该用 core.setHeroLoc()
		 turn:dir 勇士转向某个方向，dir 可以为 up down left right（此项一般是读取自动存档产生的，属于样板的不良特性，请勿滥用）
		 getNext 轻按获得身边道具，优先获得面前的（面前没有则按上下左右顺序依次获得），身边如果没有道具则此项会被跳过
		 input:none “等待用户操作事件”中超时（作者未设置超时时间则此项会导致报错）
		 input:xxx 可能表示“等待用户操作事件”的一个操作（如按键操作将直接记录 input:keycode ），
		 也可能表示一个“接受用户输入数字”的输入，后者的情况下 xxx 为输入的整数。此项缺失的话前者将直接报错，后者将用0代替（后者现在支持负数了）
		 input2:xxx 可能表示“读取全局存储（core.getGlobal）”读取到的值，也可能表示一个“接受用户输入文本”的输入，
		 两种情况下 xxx 都为 base64 编码。此项缺失的话前者将重新现场读取，后者将用空字符串代替
		 no 走到可穿透的楼梯上不触发楼层切换事件，通过本插件可以让勇士停在旁边没有障碍物的楼梯上哦～
		 move:x:y 尝试瞬移到 [x,y] 点（不改变朝向），该点甚至可以和勇士相邻或者位于视野外
		 key:n 松开键值为n的键，如 key:49 表示松开大键盘数字键1，默认会触发使用破墙镐
		 click:n:px:py 点击自绘状态栏，n为0表示横屏1表示竖屏，[px,py] 为点击的像素坐标
		 random:n 生成了随机数n，即 core.rand2(num) 的返回结果，n必须在 [0,num-1] 范围，num必须为正整数。此项缺失将导致现场重新随机生成数值，可能导致回放结果不一致！
		 作者自定义的新项（一般为js对象，可以先JSON.stringify()再core.encodeBase64()得到纯英文数字的内容）需要用(半角圆括弧)括起来。
		 
		 当您使用数字键5将一些项追加到即将播放内容的开头时，请注意要逆序逐项追加，或者每追加一项就按下数字键7或字母键N单步播放一步。
		 但是【input input2 random choices】是被动读取的，单步播放如果触发了相应的事件就会连续读取，这时候只能提前逐项追加好。
		 电脑端熟练以后推荐直接在控制台操作 core.status.route 和 core.status.replay.toReplay（后者录像回放时才有），配合 core.push() 和 core.unshift() 更加灵活自由哦！
		 */
		core.actions.registerAction('onkeyUp', '_sys_onkeyUp_replay', function (e) {
			if (this._checkReplaying()) {
				if (e.keyCode == 27) // ESCAPE
					core.stopReplay();
				else if (e.keyCode == 90) // Z
					core.speedDownReplay();
				else if (e.keyCode == 67) // C
					core.speedUpReplay();
				else if (e.keyCode == 32) // SPACE
					core.triggerReplay();
				else if (e.keyCode == 65) // A
					core.rewindReplay();
				else if (e.keyCode == 83) // S
					core.control._replay_SL();
				else if (e.keyCode == 88) // X
					core.control._replay_book();
				else if (e.keyCode == 33 || e.keyCode == 34) // PgUp/PgDn
					core.control._replay_viewMap();
				else if (e.keyCode == 78) // N
					core.stepReplay();
				else if (e.keyCode == 84) // T
					core.control._replay_toolbox();
				else if (e.keyCode == 81) // Q
					core.control._replay_equipbox();
				else if (e.keyCode == 66) // B
					core.ui._drawStatistics();
				else if (e.keyCode == 49 || e.keyCode == 54) // 1/6，原速/24倍速播放
					core.setReplaySpeed(e.keyCode == 49 ? 1 : 24);
				else if (e.keyCode > 49 && e.keyCode < 54) { // 2-5，录像精修
					switch (e.keyCode - 48) {
						case 2: // pop
							alert("您已移除已录制内容的最后一项：" + core.status.route.pop());
							break;
						case 3: // push
							core.utils.myprompt("请输入您要追加到已录制内容末尾的项：", "", function (value) {
								if (value != null) core.status.route.push(value);
							});
							break;
						case 4: // shift
							alert("您已移除即将播放内容的第一项：" + core.status.replay.toReplay.shift());
							break;
						case 5: // unshift
							core.utils.myprompt("请输入您要追加到即将播放内容开头的项：", "", function (value) {
								if (value != null) core.status.replay.toReplay.unshift(value);
							});
					}
				}
				return true;
			}
		}, 100);
	},
    "numpad": function () {
		// 样板自带的整数输入事件为白屏弹窗且可以误输入任意非法内容但不支持负整数，观感较差。本插件可以将其美化成仿RM样式，使其支持负整数同时带有音效
		// 另一方面，4399等第三方平台不允许使用包括 core.myprompt() 和 core.myconfirm() 在内的弹窗，因此也需要此插件来替代，不然类似生命魔杖的道具就不好实现了
		// 关于负整数输入，V2.8.2原生支持其录像的压缩和解压，只是默认的 core.events._action_input() 函数将负数取了绝对值，可以只复写下面的 core.isReplaying() 部分来取消

		// 是否启用本插件，false表示禁用，true表示启用
		var __enable = true;
		if (!__enable) return;

		core.events._action_input = function (data, x, y, prefix) { // 复写整数输入事件
			if (core.isReplaying()) { // 录像回放时，处理方式不变，但增加负整数支持
				core.events.__action_getInput(core.replaceText(data.text, prefix), false, function (value) {
					value = parseInt(value) || 0; // 去掉了取绝对值的步骤
					core.status.route.push("input:" + value);
					core.setFlag("input", value);
					core.doAction();
				});
			} else {
				// 正常游戏中，采用暂停录制的方式然后用事件流循环“绘制-等待-变量操作”三板斧实现（按照13*13适配的）。
				// 您可以自行修改循环内的内容来适配15*15或其他需求，或干脆作为公共事件编辑。
				core.insertAction([
					// 记录当前录像长度，下面的循环结束后裁剪。达到“暂停录制”的效果
					{ "type": "function", "function": "function(){flags['@temp@length']=core.status.route.length}" },
					{ "type": "setValue", "name": "flag:input", "value": "0" },
					{
						"type": "while",
						"condition": "true",
						"data": [
							{ "type": "drawBackground", "background": "winskin.png", "x": 16, "y": 16, "width": 384, "height": 384 },
							{ "type": "drawIcon", "id": "X10181", "x": 32, "y": 288 },
							{ "type": "drawIcon", "id": "X10185", "x": 64, "y": 288 },
							{ "type": "drawIcon", "id": "X10186", "x": 96, "y": 288 },
							{ "type": "drawIcon", "id": "X10187", "x": 128, "y": 288 },
							{ "type": "drawIcon", "id": "X10188", "x": 160, "y": 288 },
							{ "type": "drawIcon", "id": "X10189", "x": 192, "y": 288 },
							{ "type": "drawIcon", "id": "X10193", "x": 224, "y": 288 },
							{ "type": "drawIcon", "id": "X10194", "x": 256, "y": 288 },
							{ "type": "drawIcon", "id": "X10195", "x": 288, "y": 288 },
							{ "type": "drawIcon", "id": "X10196", "x": 320, "y": 288 },
							{ "type": "drawIcon", "id": "X10197", "x": 352, "y": 288 },
							{ "type": "drawIcon", "id": "X10286", "x": 32, "y": 352 },
							{ "type": "drawIcon", "id": "X10169", "x": 96, "y": 352 },
							{ "type": "drawIcon", "id": "X10232", "x": 128, "y": 352 },
							{ "type": "drawIcon", "id": "X10185", "x": 320, "y": 352 },
							{ "type": "drawIcon", "id": "X10242", "x": 352, "y": 352 },
							{ "type": "fillBoldText", "x": 48, "y": 256, "style": [255, 255, 255, 1], "font": "bold 32px Consolas", "text": "${flag:input}" },
							{ "type": "fillBoldText", "x": 32, "y": 48, "style": [255, 255, 255, 1], "font": "16px Consolas", "text": core.replaceText(data.text, prefix) },
							{
								"type": "wait",
								"forceChild": true,
								"data": [{
									"case": "keyboard",
									"keycode": "48,49,50,51,52,53,54,55,56,57",
									"action": [
										// 按下数字键，追加到已输入内容的末尾，但禁止越界。变量：keycode-48就是末位数字
										{ "type": "playSound", "name": "光标移动" },
										{
											"type": "if",
											"condition": "(flag:input<0)",
											"true": [
												{ "type": "setValue", "name": "flag:input", "value": "10*flag:input-(flag:keycode-48)" },
											],
											"false": [
												{ "type": "setValue", "name": "flag:input", "value": "10*flag:input+(flag:keycode-48)" },
											]
										},
										{ "type": "setValue", "name": "flag:input", "value": "core.clamp(flag:input,-9e15,9e15)" },
									]
								},
								{
									"case": "keyboard",
									"keycode": "189",
									"action": [
										// 按下减号键，变更已输入内容的符号
										{ "type": "playSound", "name": "跳跃" },
										{ "type": "setValue", "name": "flag:input", "value": "-flag:input" },
									]
								},
								{
									"case": "keyboard",
									"keycode": "8",
									"action": [
										// 按下退格键，从已输入内容的末尾删除一位
										{ "type": "playSound", "name": "取消" },
										{ "type": "setValue", "name": "flag:input", "operator": "//=", "value": "10" },
									]
								},
								{
									"case": "keyboard",
									"keycode": "27",
									"action": [
										// 按下ESC键，清空已输入内容
										{ "type": "playSound", "name": "读档" },
										{ "type": "setValue", "name": "flag:input", "value": "0" },
									]
								},
								{
									"case": "keyboard",
									"keycode": "13",
									"action": [
										// 按下回车键，确定
										{ "type": "break", "n": 1 },
									]
								},
								{
									"case": "mouse",
									"px": [32, 63],
									"py": [288, 320],
									"action": [
										// 点击减号，变号。右边界写63防止和下面重叠
										{ "type": "playSound", "name": "跳跃" },
										{ "type": "setValue", "name": "flag:input", "value": "-flag:input" },
									]
								},
								{
									"case": "mouse",
									"px": [64, 384],
									"py": [288, 320],
									"action": [
										// 点击数字，追加到已输入内容的末尾，但禁止越界。变量：x-2就是末位数字
										{ "type": "playSound", "name": "光标移动" },
										{
											"type": "if",
											"condition": "(flag:input<0)",
											"true": [
												{ "type": "setValue", "name": "flag:input", "value": "10*flag:input-(flag:x-2)" },
											],
											"false": [
												{ "type": "setValue", "name": "flag:input", "value": "10*flag:input+(flag:x-2)" },
											]
										},
										{ "type": "setValue", "name": "flag:input", "value": "core.clamp(flag:input,-9e15,9e15)" },
									]
								},
								{
									"case": "mouse",
									"px": [32, 64],
									"py": [352, 384],
									"action": [
										// 点击左箭头，退格
										{ "type": "playSound", "name": "取消" },
										{ "type": "setValue", "name": "flag:input", "operator": "//=", "value": "10" },
									]
								},
								{
									"case": "mouse",
									"px": [96, 160],
									"py": [352, 384],
									"action": [
										// 点击CE，清空
										{ "type": "playSound", "name": "读档" },
										{ "type": "setValue", "name": "flag:input", "value": "0" },
									]
								},
								{
									"case": "mouse",
									"px": [320, 384],
									"py": [352, 384],
									"action": [
										// 点击OK，确定
										{ "type": "break", "n": 1 },
									]
								}
								]
							}
						]
					},
					{ "type": "clearMap" },
					// 裁剪录像，只保留'input:n'，然后继续录制
					{ "type": "function", "function": "function(){core.status.route.splice(flags['@temp@length']);core.status.route.push('input:'+core.getFlag('input',0))}" }
				], x, y);
				core.events.doAction();
			}
		}
	},
    "sprites": function () {
		// 基于canvas的sprite化，摘编整理自万宁魔塔
		// 
		// ---------------------------------------- 第一部分 js代码 （必装） --------------------------------------- //

		/* ---------------- 用法说明 ---------------- *
		 * 1. 创建sprite: var sprite = new Sprite(x, y, w, h, z, reference, name);
		 *   其中x y w h为画布的横纵坐标及长宽，reference为参考系，只能填game（相对于游戏画面）和window（相对于窗口）
		 *   且当为相对游戏画面时，长宽与坐标将会乘以放缩比例（相当于用createCanvas创建）
		 *   z为纵深，表示不同元素之间的覆盖关系，大的覆盖小的
		 *   name为自定义名称，可以不填
		 * 2. 删除: sprite.destroy();
		 * 3. 设置css特效: sprite.setCss(css);
		 *   其中css直接填 box-shadow: 0px 0px 10px black;的形式即可，与style标签与css文件内写法相同
		 *   对于已设置的特效，如果之后不需要再次设置，可以不填
		 * 4. 添加事件监听器: sprite.addEventListener(); 用法与html元素的addEventListener完全一致
		 * 5. 移除事件监听器: sprite.removeEventListener(); 用法与html元素的removeEventListener完全一致
		 * 6. 属性列表
		 *   (1) sprite.x | sprite.y | sprite.width | sprite.height | sprite.zIndex | sprite.reference 顾名思义
		 *   (2) sprite.canvas 该sprite的画布
		 *   (3) sprite.context 该画布的CanvasRenderingContext2d对象，即样板中常见的ctx
		 *   (4) sprite.count 不要改这个玩意
		 * 7. 使用样板api进行绘制
		 *   示例：
		 *   var ctx = sprite.context;
		 *   core.fillText(ctx, 'xxx', 100, 100);
		 *   core.fillRect(ctx, 0, 0, 50, 50);
		 *   当然也可以使用原生js
		 *   ctx.moveTo(0, 0);
		 *   ctx.bezierCurveTo(50, 50, 100, 0, 100, 50);
		 *   ctx.stroke();
		 * ---------------- 用法说明 ---------------- */

		var count = 0;

		/** 创建一个sprite画布
		 * @param {number} x
		 * @param {number} y
		 * @param {number} w
		 * @param {number} h
		 * @param {number} z
		 * @param {'game' | 'window'} reference 参考系，游戏画面或者窗口
		 * @param {string} name 可选，sprite的名称，方便通过core.dymCanvas获取
		 */
		function Sprite (x, y, w, h, z, reference, name) {
			this.x = x;
			this.y = y;
			this.width = w;
			this.height = h;
			this.zIndex = z;
			this.reference = reference;
			this.canvas = null;
			this.context = null;
			this.count = 0;
			this.name = name || '_sprite_' + count;
			this.style = null;
			/** 初始化 */
			this.init = function () {
				if (reference === 'window') {
					var canvas = document.createElement('canvas');
					this.canvas = canvas;
					this.context = canvas.getContext('2d');
					canvas.width = w;
					canvas.height = h;
					canvas.style.width = w + 'px';
					canvas.style.height = h + 'px';
					canvas.style.position = 'absolute';
					canvas.style.top = y + 'px';
					canvas.style.left = x + 'px';
					canvas.style.zIndex = z.toString();
					document.body.appendChild(canvas);
					this.style = canvas.style;
				} else {
					this.context = core.createCanvas(this.name || '_sprite_' + count, x, y, w, h, z);
					this.canvas = this.context.canvas;
					this.canvas.style.pointerEvents = 'auto';
					this.style = this.canvas.style;
				}
				this.count = count;
				count++;
			}
			this.init();

			/** 设置css特效
			 * @param {string} css
			 */
			this.setCss = function (css) {
				css = css.replace('\n', ';').replace(';;', ';');
				var effects = css.split(';');
				var self = this;
				effects.forEach(function (v) {
					var content = v.split(':');
					var name = content[0];
					var value = content[1];
					name = name.trim().split('-').reduce(function (pre, curr, i, a) {
						if (i === 0 && curr !== '') return curr;
						if (a[0] === '' && i === 1) return curr;
						return pre + curr.toUpperCase()[0] + curr.slice(1);
					}, '');
					var canvas = self.canvas;
					if (name in canvas.style) canvas.style[name] = value;
				});
				return this;
			}

			/** 
			 * 移动sprite
			 * @param {boolean} isDelta 是否是相对位置，如果是，那么sprite会相对于原先的位置进行移动
			 */
			this.move = function (x, y, isDelta) {
				if (x !== undefined && x !== null) this.x = x;
				if (y !== undefined && y !== null) this.y = y;
				if (this.reference === 'window') {
					var ele = this.canvas;
					ele.style.left = x + (isDelta ? parseFloat(ele.style.left) : 0) + 'px';
					ele.style.top = y + (isDelta ? parseFloat(ele.style.top) : 0) + 'px';
				} else core.relocateCanvas(this.context, x, y, isDelta);
				return this;
			}

			/** 
			 * 重新设置sprite的大小
			 * @param {boolean} styleOnly 是否只修改css效果，如果是，那么将会不高清，如果不是，那么会清空画布
			 */
			this.resize = function (w, h, styleOnly) {
				if (w !== undefined && w !== null) this.w = w;
				if (h !== undefined && h !== null) this.h = h;
				if (reference === 'window') {
					var ele = this.canvas;
					ele.style.width = w + 'px';
					ele.style.height = h + 'px';
					if (!styleOnly) {
						ele.width = w;
						ele.height = h;
					}
				} else core.resizeCanvas(this.context, w, h, styleOnly);
				return this;
			}

			/**
			 * 旋转画布
			 */
			this.rotate = function (angle, cx, cy) {
				if (this.reference === 'window') {
					var left = this.x;
					var top = this.y;
					this.canvas.style.transformOrigin = (cx - left) + 'px ' + (cy - top) + 'px';
					if (angle === 0) {
						canvas.style.transform = '';
					} else {
						canvas.style.transform = 'rotate(' + angle + 'deg)';
					}
				} else {
					core.rotateCanvas(this.context, angle, cx, cy);
				}
				return this;
			}

			/**
			 * 清除sprite
			 */
			this.clear = function (x, y, w, h) {
				if (this.reference === 'window') {
					this.context.clearRect(x, y, w, h);
				} else {
					core.clearMap(this.context, x, y, w, h);
				}
				return this;
			}

			/** 删除 */
			this.destroy = function () {
				if (this.reference === 'window') {
					if (this.canvas) document.body.removeChild(this.canvas);
				} else {
					core.deleteCanvas(this.name || '_sprite_' + this.count);
				}
			}

			/** 添加事件监听器 */
			this.addEventListener = function () {
				this.canvas.addEventListener.apply(this.canvas, arguments);
			}

			/** 移除事件监听器 */
			this.removeEventListener = function () {
				this.canvas.removeEventListener.apply(this.canvas, arguments);
			}
		}

		window.Sprite = Sprite;
	},
    "hotReload": function () {
		/* ---------- 功能说明 ---------- *

		1. 当 libs/ main.js index.html 中的任意一个文件被更改后，会自动刷新塔的页面
		2. 修改楼层文件后自动在塔的页面上显示出来，不需要刷新
		3. 修改脚本编辑或插件编写后也能自动更新更改的插件或脚本，但不保证不会出问题（一般都不会有问题的
		4. 修改图块属性、怪物属性等后会自动更新
		5. 当全塔属性被修改时，会自动刷新塔的页面
		6. 样板的 styles.css 被修改后也可以直接显示，不需要刷新
		7. 其余内容修改后不会自动更新也不会刷新

		/* ---------- 使用方式 ---------- *

		1. 前往 https://nodejs.org/en/ 下载node.js的LTS版本（点左边那个绿色按钮）并安装
		2. 将该插件复制到插件编写中
		3. 在造塔群的群文件-魔塔样板·改中找到server.js，下载并放到塔的根目录（与启动服务同一级）
		4. 在该目录下按下shift+鼠标右键（win11只按右键即可），选择在终端打开或在powershell打开
		5. 运行node server.js即可

		*/

		if (main.mode !== 'play' || main.replayChecking) return;

		/**
		 * 发送请求
		 * @param {string} url
		 * @param {string} type
		 * @param {string} data
		 * @returns {Promise<string>}
		 */
		async function post(url, type, data) {
			const xhr = new XMLHttpRequest();
			xhr.open(type, url);
			xhr.send(data);
			const res = await new Promise(res => {
				xhr.onload = e => {
					if (xhr.status !== 200) {
						console.error(`hot reload: http ${xhr.status}`);
						res('@error');
					} else res('success');
				};
				xhr.onerror = e => {
					res('@error');
					console.error(`hot reload: error on connection`);
				};
			});
			if (res === 'success') return xhr.response;
			else return '@error';
		}

		/**
		 * 热重载css
		 * @param {string} data
		 */
		function reloadCss(data) {
			const all = Array.from(document.getElementsByTagName('link'));
			all.forEach(v => {
				if (v.rel !== 'stylesheet') return;
				if (v.href === `http://127.0.0.1:3000/${data}`) {
					v.remove();
					const link = document.createElement('link');
					link.rel = 'stylesheet';
					link.type = 'text/css';
					link.href = data;
					document.head.appendChild(link);
					console.log(`css hot reload: ${data}`);
				}
			});
		}

		/**
		 * 热重载楼层
		 * @param {string} data
		 */
		async function reloadFloor(data) {
			// 首先重新加载main.floors对应的楼层
			await import(`/project/floors/${data}.js?v=${Date.now()}`);
			// 然后写入core.floors并解析
			core.floors[data] = main.floors[data];
			const floor = core.loadFloor(data);
			if (core.isPlaying()) {
				core.status.maps[data] = floor;
				delete core.status.mapBlockObjs[data];
				core.extractBlocks(data);
				if (data === core.status.floorId) {
					core.drawMap(data);
					core.setWeather(
						core.animateFrame.weather.type,
						core.animateFrame.weather.level
					);
				}
				core.updateStatusBar(true, true);
			}
			console.log(`floor hot reload: ${data}`);
		}

		/**
		 * 热重载脚本编辑及插件编写
		 * @param {string} data
		 */
		async function reloadScript(data) {
			if (data === 'plugins') {
				// 插件编写比较好办
				const before = plugins_bb40132b_638b_4a9f_b028_d3fe47acc8d1;
				// 这里不能用动态导入，因为动态导入会变成模块，变量就不是全局的了
				const script = document.createElement('script');
				script.src = `/project/plugins.js?v=${Date.now()}`;
				document.body.appendChild(script);
				await new Promise(res => {
					script.onload = () => res('success');
				});
				const after = plugins_bb40132b_638b_4a9f_b028_d3fe47acc8d1;
				// 找到差异的函数
				for (const id in before) {
					const fn = before[id];
					if (typeof fn !== 'function') continue;
					if (fn.toString() !== after[id]?.toString()) {
						try {
							core.plugin[id] = after[id];
							core.plugin[id].call(core.plugin);
							core.updateStatusBar(true, true);
							console.log(`plugin hot reload: ${id}`);
						} catch (e) {
							console.error(e);
						}
					}
				}
			} else if (data === 'functions') {
				// 脚本编辑略微麻烦点
				const before = functions_d6ad677b_427a_4623_b50f_a445a3b0ef8a;
				// 这里不能用动态导入，因为动态导入会变成模块，变量就不是全局的了
				const script = document.createElement('script');
				script.src = `/project/functions.js?v=${Date.now()}`;
				document.body.appendChild(script);
				await new Promise(res => {
					script.onload = () => res('success');
				});
				const after = functions_d6ad677b_427a_4623_b50f_a445a3b0ef8a;
				// 找到差异的函数
				for (const mod in before) {
					const fns = before[mod];
					for (const id in fns) {
						const fn = fns[id];
						if (typeof fn !== 'function' || id === 'hasSpecial')
							continue;
						const now = after[mod][id];
						if (fn.toString() !== now.toString()) {
							try {
								if (mod === 'events') {
									core.events.eventdata[id] = now;
								} else if (mod === 'enemys') {
									core.enemys.enemydata[id] = now;
								} else if (mod === 'actions') {
									core.actions.actionsdata[id] = now;
								} else if (mod === 'control') {
									core.control.controldata[id] = now;
								} else if (mod === 'ui') {
									core.ui.uidata[id] = now;
								}
								core.updateStatusBar(true, true);
								console.log(
									`function hot reload: ${mod}.${id}`
								);
							} catch (e) {
								console.error(e);
							}
						}
					}
				}
			}
		}

		/**
		 * 属性热重载，包括全塔属性等
		 * @param {string} data
		 */
		async function reloadData(data) {
			const script = document.createElement('script');
			script.src = `/project/${data}.js?v=${Date.now()}`;
			document.body.appendChild(script);
			await new Promise(res => {
				script.onload = () => res('success');
			});

			let after;
			if (data === 'data')
				after = data_a1e2fb4a_e986_4524_b0da_9b7ba7c0874d;
			if (data === 'enemys')
				after = enemys_fcae963b_31c9_42b4_b48c_bb48d09f3f80;
			if (data === 'icons')
				after = icons_4665ee12_3a1f_44a4_bea3_0fccba634dc1;
			if (data === 'items')
				after = items_296f5d02_12fd_4166_a7c1_b5e830c9ee3a;
			if (data === 'maps')
				after = maps_90f36752_8815_4be8_b32b_d7fad1d0542e;
			if (data === 'events')
				after = events_c12a15a8_c380_4b28_8144_256cba95f760;

			if (data === 'enemys') {
				core.enemys.enemys = after;
				for (var enemyId in after) {
					core.enemys.enemys[enemyId].id = enemyId;
				}
				core.material.enemys = core.getEnemys();
			} else if (data === 'icons') {
				core.icons.icons = after;
				core.material.icons = core.getIcons();
			} else if (data === 'items') {
				core.items.items = after;
				for (var itemId in after) {
					core.items.items[itemId].id = itemId;
				}
				core.material.items = core.getItems();
			} else if (data === 'maps') {
				core.maps.blocksInfo = after;
				core.status.mapBlockObjs = {};
				core.status.number2block = {};
				Object.values(core.status.maps).forEach(v => delete v.blocks);
				core.extractBlocks();
				core.setWeather(
					core.animateFrame.weather.type,
					core.animateFrame.weather.level
				);
				core.drawMap();
			} else if (data === 'events') {
				core.events.commonEvent = after.commonEvent;
			} else if (data === 'data') {
				location.reload();
			}
			core.updateStatusBar(true, true);
			console.log(`data hot reload: ${data}`);
		}

		// 初始化
		(async function () {
			const data = await post('/reload', 'POST', 'test');
			if (data === '@error') {
				console.log(`未检测到node服务，热重载插件将无法使用`);
			} else {
				console.log(`热重载插件加载成功`);
				// reload
				setInterval(async () => {
					const res = await post('/reload', 'POST');
					if (res === '@error') return;
					if (res === 'true') location.reload();
					else return;
				}, 1000);

				// hot reload
				setInterval(async () => {
					const res = await post('/hotReload', 'POST');
					const data = res.split('@@');
					data.forEach(v => {
						if (v === '') return;
						const [type, file] = v.split(':');
						if (type === 'css') reloadCss(file);
						if (type === 'data') reloadData(file);
						if (type === 'floor') reloadFloor(file);
						if (type === 'script') reloadScript(file);
					});
				}, 1000);
			}
		})();
	},
    "函数覆写": function () {
	enemys.prototype.canBattle = function (enemy, x, y, floorId) {
		if (typeof enemy == 'string') enemy = core.material.enemys[enemy];
		var info = this.getDamageInfo(enemy, { lv: 0 }, x, y, floorId);
		return info != null && info.damage < core.status.hero.hp;
	}
	//怪物手册中自定义怪物合并
	function isSpecialEqual(a, b) {

		// 1. 统一「无 special」
		const isEmpty = function (v) {
			return v == null || v === 0 || (Array.isArray(v) && v.length === 0);
		};
		if (isEmpty(a) && isEmpty(b)) return true;

		// 2. 统一为数组
		const toArray = function (v) {
			if (Array.isArray(v)) return v;
			if (v == null || v === 0) return [];
			return [v];
		};

		let aa = toArray(a);
		let bb = toArray(b);

		if (aa.length !== bb.length) return false;

		// 3. 内容比较（无视顺序）
		aa = aa.slice().sort();
		bb = bb.slice().sort();

		for (var i = 0; i < aa.length; i++) {
			if (!Object.is(aa[i], bb[i])) return false;
		}

		return true;
	}
	// 1. 修改怪物信息获取逻辑，增加 noCritDamage 字段的计算
	// 将此函数完全覆盖原有 enemys.prototype._getCurrentEnemys_addEnemy
	enemys.prototype._getCurrentEnemys_addEnemy = function (enemyId, enemys, used, x, y, floorId) {
		var enemy = this._getCurrentEnemys_getEnemy(enemyId);
		if (enemy == null) return;

		// ✅ 保存原始坐标
		var origX = x,
			origY = y;

		var id = enemy.id;

		var enemyInfo = this.getEnemyInfo(enemy, null, null, null, floorId);
		var locEnemyInfo = this.getEnemyInfo(enemy, null, x, y, floorId);

		// 辅助函数：比较两个对象属性是否相同
		var areEnemiesEqual = function (infoA, infoB) {
			var baseProps = ['atk', 'def', 'hp', 'money', 'exp', 'point'];
			for (var i = 0; i < baseProps.length; i++) {
				var prop = baseProps[i];
				if (!Object.is(infoA[prop], infoB[prop])) {
					return false;
				}
			}
			// 特殊处理 special 属性
			return isSpecialEqual(infoA.special, infoB.special);
		};

		var currentEnemyInfo;
		if (!core.flags.enableEnemyPoint || areEnemiesEqual(locEnemyInfo, enemyInfo)) {
			x = null;
			y = null;
			currentEnemyInfo = enemyInfo;
		} else {
			// 检查enemys中是否存在相同属性的怪物
			for (var i = 0; i < enemys.length; ++i) {
				var one = enemys[i];
				if (id == one.id && one.locs != null && areEnemiesEqual(locEnemyInfo, one)) {
					one.locs.push([x, y]);
					return;
				}
			}
			currentEnemyInfo = locEnemyInfo;
		}

		var id = enemy.id + ":" + x + ":" + y;
		if (used[id]) return;
		used[id] = true;

		var specialText = core.enemys.getSpecialText(currentEnemyInfo);
		var specialColor = core.enemys.getSpecialColor(currentEnemyInfo);

		var critical = this.nextCriticals(enemy, 1, x, y, floorId);
		if (critical.length > 0) critical = critical[0];

		var e = core.clone(enemy);
		for (var v in currentEnemyInfo) {
			e[v] = currentEnemyInfo[v];
		}
		if (x != null && y != null) {
			e.locs = [
				[x, y]
			];
		}
		e.name = core.getEnemyValue(enemy, 'name', x, y, floorId);
		e.specialText = specialText;
		e.specialColor = specialColor;
		e.damage = this.getDamage(enemy, x, y, floorId);

		// =========== 【新增代码 START】 计算无暴击伤害 ===========
		// 获取 lv:0 时的伤害信息，注意判空
		var noCritInfo = this.getDamageInfo(enemy, { lv: 0 }, x, y, floorId);
		e.noCritDamage = noCritInfo ? noCritInfo.damage : null;
		// =========== 【新增代码 END】 ==========================

		e.critical = critical[0];
		e.criticalDamage = critical[1];
		e.defDamage = this._getCurrentEnemys_addEnemy_defDamage(enemy, x, y, floorId);

		// ✅ 使用原始坐标获取正确的filter
		e.filter = core.getBlockFilter(origX, origY, floorId);

		enemys.push(e);
	};

	// 2. 修改怪物手册列表绘制，显示无暴击伤害
	ui.prototype._drawBook_drawDamage = function (index, enemy, offset, position) {
		core.setTextAlign('ui', 'center');

		var damage = enemy.damage;
		var color = '#FFFF00';

		// =====================================================
		// 不可开战判定（基于 noCritDamage）
		// =====================================================
		var cannotBattle =
			enemy.noCritDamage == null ||
			enemy.noCritDamage >= core.status.hero.hp;

		if (cannotBattle) {
			// 不可开战：统一红色
			color = '#FF2222';

			if (damage == null) {
				damage = '无法战斗';
			} else {
				damage = core.formatBigNumber(damage);
				if (
					enemy.noCritDamage != null &&
					enemy.noCritDamage !== enemy.damage
				) {
					damage += "(" + core.formatBigNumber(enemy.noCritDamage) + ")";
				}
			}
		} else {
			// =================================================
			// 可开战：原有颜色分级逻辑
			// =================================================
			if (damage >= core.status.hero.hp * 2 / 3) color = '#FF9933';
			else if (damage <= 0) color = '#11FF11';

			damage = core.formatBigNumber(damage);

			// ---------- 显示无暴击伤害 ----------
			if (
				enemy.noCritDamage != null &&
				enemy.noCritDamage !== enemy.damage
			) {
				damage += "(" + core.formatBigNumber(enemy.noCritDamage) + ")";
			}

			// ---------- 特殊标记 ----------
			if (core.enemys.hasSpecial(enemy, 19)) damage += "+";
			if (core.enemys.hasSpecial(enemy, 21)) damage += "-";
			if (core.enemys.hasSpecial(enemy, 11)) damage += "^";
		}

		// ---------- 禁用炸弹 ----------
		if (enemy.notBomb) damage += "[b]";

		core.fillText(
			'ui',
			damage,
			offset,
			position,
			color,
			this._buildFont(13, true)
		);
	};



	enemys.prototype.getDamageString = function (enemy, x, y, floorId) {
		if (typeof enemy == 'string') enemy = core.material.enemys[enemy];

		// 当前（可能含暴击）的显示伤害
		var damage = this.getDamage(enemy, x, y, floorId);

		// lv:0 的真实战斗信息（用于可战判定）
		var info = this.getDamageInfo(enemy, { lv: 0 }, x, y, floorId);

		var color = '#000000';

		// =====================================================
		// 不可开战：统一红色
		// =====================================================
		if (info == null || info.damage >= core.status.hero.hp) {
			color = '#FF2222';

			if (damage == null) {
				damage = "???";
			} else {
				damage = core.formatBigNumber(damage, true);
			}
		} else {
			// =================================================
			// 可开战：原有颜色分级
			// =================================================
			if (damage <= 0) color = '#11FF11';
			else if (damage < core.status.hero.hp / 3) color = '#FFFFFF';
			else if (damage < core.status.hero.hp * 2 / 3) color = '#FFFF00';
			else if (damage < core.status.hero.hp) color = '#FF9933';
			else color = '#FF2222'; // 理论上走不到，但兜底

			damage = core.formatBigNumber(damage, true);

			if (core.enemys.hasSpecial(enemy, 19)) damage += "+";
			if (core.enemys.hasSpecial(enemy, 21)) damage += "-";
			if (core.enemys.hasSpecial(enemy, 11)) damage += "^";
		}

		return {
			"damage": damage,
			"color": color
		};
	};


	// 3. 修改详细信息文本获取流程
	ui.prototype._drawBookDetail_getTexts = function (enemy, floorId, texts) {
		// --- 原始数值
		this._drawBookDetail_origin(enemy, texts);
		// --- 模仿临界计算器
		this._drawBookDetail_mofang(enemy, texts);
		// --- 吸血怪最低生命值
		this._drawBookDetail_vampire(enemy, floorId, texts);

		// =========== 【新增代码 START】 插入无暴击信息 ===========
		this._drawBookDetail_noCrit(enemy, texts);
		// =========== 【新增代码 END】 ==========================

		// --- 仇恨伤害
		this._drawBookDetail_hatred(enemy, texts);
		// --- 战斗回合数，临界表
		this._drawBookDetail_turnAndCriticals(enemy, floorId, texts);
	}

	// 4. 新增：详细信息中的无暴击伤害文本生成
	ui.prototype._drawBookDetail_noCrit = function (enemy, texts) {
		// 只有当存在有效数值，且和正常显示伤害不同时才显示
		// 如果你希望在详细信息里始终显示，可以去掉 && 后的判断
		if (enemy.noCritDamage != null && enemy.noCritDamage !== enemy.damage) {
			texts.push("无暴击伤害：" + core.formatBigNumber(enemy.noCritDamage));
		}
	}
	// 修复，现在选择不存在时报错
	events.prototype.__action_choices_replaying = function (data, index) {
		var selection = index;
		if (index != 'none') {
			selection = parseInt(index);
			if (isNaN(selection)) return false;
			if (selection < 0) selection += data.choices.length;
			if (selection < 0) return false;
			if (selection % 100 > 50) selection += data.choices.length;
			if (selection % 100 > data.choices.length) return false;
			var timeout = Math.floor(selection / 100) || 0;
			core.setFlag('timeout', timeout);
			selection %= 100;
		} else core.setFlag('timeout', 0);
		core.status.event.selection = selection;
		setTimeout(function () {
			core.status.route.push("choices:" + index);
			if (selection != 'none') {
				// 检查
				var choice = data.choices[selection];
				if (!choice || (choice.need != null && choice.need != '' && !core.calValue(choice.need))) {
					// 无法选择此项
					core.control._replay_error("无法选择项：" + index);
					return;
				} else {
					core.insertAction(choice.action);
				}
			}
			core.doAction();
		}, core.status.replay.speed == 24 ? 1 : 750 / Math.max(1, core.status.replay.speed));
		return true;
	}
	control.prototype.getRealStatusOrDefault = function (status, name) {
		if (status && name in status)
			return Math.floor(status[name]);
		return Math.floor(this.getStatus(name) * this.getBuff(name));
	}
	//临界函数修复，现在会计入敌人的额外属性加成
	enemys.prototype._nextCriticals_overAtk = function (enemy, x, y, floorId) {
		var hero_atk = core.getRealStatusOrDefault(null, 'atk');
		var enemyInfo = core.enemys.getEnemyInfo(enemy, null, x, y, floorId);
		var calNext = function (currAtk, maxAtk) {
			var start = currAtk,
				end = maxAtk;
			if (start > end) return null;

			while (start < end) {
				var mid = Math.floor((start + end) / 2);
				if (mid - start > end - mid) mid--;
				var nextInfo = core.enemys.getDamageInfo(enemy, { "atk": mid }, x, y, floorId);
				if (nextInfo != null) end = mid;
				else start = mid + 1;
			}
			var nextInfo = core.enemys.getDamageInfo(enemy, { "atk": start }, x, y, floorId);
			return nextInfo == null ? null : [start - hero_atk, nextInfo];
		}
		return calNext(hero_atk + 1,
			enemyInfo.hp + enemyInfo.def);
	}
	//临界计算现在会以当前勇士攻击力为准，也就是会计入buff
	enemys.prototype._nextCriticals_useBinarySearch = function (enemy, info, number, x, y, floorId) {
		var mon_hp = info.mon_hp,
			hero_atk = core.getRealStatusOrDefault(null, 'atk'),
			mon_def = info.mon_def,
			pre = info.damage;
		var list = [];
		var start_atk = hero_atk;
		if (info.__over__) {
			start_atk += info.__overAtk__;
			list.push([info.__overAtk__, -info.damage]);
		}
		var calNext = function (currAtk, maxAtk) {
			var start = Math.floor(currAtk),
				end = Math.floor(maxAtk);
			if (start > end) return null;

			while (start < end) {
				var mid = Math.floor((start + end) / 2);
				if (mid - start > end - mid) mid--;
				var nextInfo = core.enemys.getDamageInfo(enemy, { "atk": mid }, x, y, floorId);
				if (nextInfo == null || (typeof nextInfo == 'number')) return null;
				if (pre > nextInfo.damage) end = mid;
				else start = mid + 1;
			}
			var nextInfo = core.enemys.getDamageInfo(enemy, { "atk": start }, x, y, floorId);
			return nextInfo == null || (typeof nextInfo == 'number') || nextInfo.damage >= pre ? null : [start, nextInfo.damage];
		}
		var currAtk = start_atk;
		while (true) {
			var next = calNext(currAtk + 1, mon_hp + mon_def, pre);
			if (next == null) break;
			currAtk = next[0];
			pre = next[1];
			list.push([currAtk - hero_atk, info.damage - pre]);
			if (pre <= 0 && !core.flags.enableNegativeDamage) break;
			if (list.length >= number) break;
		}
		if (list.length == 0) list.push([0, 0]);
		return list;
	}
	// 函数修复，之前当运动回原地时会直接删除怪物数据
	events.prototype.moveEnemyOnPoint = function (fromX, fromY, toX, toY, floorId, norefresh) {
		if (fromX === toX && fromY === toY) return;
		floorId = floorId || core.status.floorId;
		if (((flags.enemyOnPoint || {})[floorId] || {})[fromX + "," + fromY]) {
			flags.enemyOnPoint[floorId][toX + "," + toY] = flags.enemyOnPoint[floorId][fromX + "," + fromY];
			delete flags.enemyOnPoint[floorId][fromX + "," + fromY];
			if (!norefresh) core.updateStatusBar();
		}
	}
	// 函数修复，转变时应该删除全局动画
	maps.prototype.setBgFgBlock = function (name, number, x, y, floorId) {
		floorId = floorId || core.status.floorId;
		if (!floorId || number == null || x == null || y == null) return;
		if (x < 0 || x >= core.floors[floorId].width || y < 0 || y >= core.floors[floorId].height) return;
		if (!name || (!name.startsWith('bg') && !name.startsWith('fg'))) return;

		if (typeof number == 'string') {
			if (/^\d+$/.test(number)) number = parseInt(number);
			else number = core.getNumberById(number);
		}

		var values = core.getFlag('__' + name + 'v__', {});
		values[floorId] = (values[floorId] || []).filter(function (one) { return one[0] != x || one[1] != y });
		values[floorId].push([x, y, number]);
		core.setFlag('__' + name + 'v__', values);

		core.status[name + "maps"][floorId] = null;

		if (floorId == core.status.floorId) {
			core.clearMap(name);
			core.removeGlobalAnimate(x, y, name);
			if (name.startsWith('bg')) core.drawBg(floorId);
			else core.drawFg(floorId);
		}
	}
	// 函数修复，隐藏时应该删除全局动画
	maps.prototype._triggerBgFgMap = function (type, name, loc, floorId, callback) {
		if (type != 'show') type = 'hide';
		if (!name || (!name.startsWith('bg') && !name.startsWith('fg'))) return;
		if (typeof loc[0] == 'number' && typeof loc[1] == 'number')
			loc = [loc];
		floorId = floorId || core.status.floorId;
		if (!floorId) return;

		if (loc.length == 0) return;
		var disabled = core.getFlag('__' + name + 'd__', {});
		disabled[floorId] = disabled[floorId] || [];
		loc.forEach(function (t) {
			if (type == 'hide') {
				disabled[floorId].push([t[0], t[1]]);
				core.removeGlobalAnimate(t[0], t[1], name);
			} else {
				disabled[floorId] = disabled[floorId].filter(function (one) { return one[0] != t[0] || one[1] != t[1] });
			}
		})
		core.setFlag('__' + name + 'd__', disabled);

		core.status[name + "maps"][floorId] = null;

		if (floorId == core.status.floorId) {
			core.redrawMap();
		}
		if (callback) callback();
	}
	// 函数修复，重绘时应该删除全局动画
	maps.prototype.redrawMap = function () {
		core.bigmap.canvas.forEach(function (one) {
			core.clearMap(one);
		});
		core.removeGlobalAnimate();
		this._drawMap_drawAll(null, { redraw: true });
		core.drawDamage();
	}
	//函数修复，增加选项不存在时的报错
	events.prototype.__action_choices_replaying = function (data, index) {
		var selection = index;
		if (index != 'none') {
			selection = parseInt(index);
			if (isNaN(selection)) return false;
			if (selection < 0) selection += data.choices.length;
			if (selection < 0) return false;
			if (selection % 100 > 50) selection += data.choices.length;
			if (selection % 100 > data.choices.length) return false;
			var timeout = Math.floor(selection / 100) || 0;
			core.setFlag('timeout', timeout);
			selection %= 100;
		} else core.setFlag('timeout', 0);
		core.status.event.selection = selection;
		setTimeout(function () {
			core.status.route.push("choices:" + index);
			if (selection != 'none') {
				// 检查
				var choice = data.choices[selection];
				if (!choice || (choice.need != null && choice.need != '' && !core.calValue(choice.need))) {
					// 无法选择此项
					core.control._replay_error("无法选择项：" + index);
					return;
				} else {
					core.insertAction(choice.action);
				}
			}
			core.doAction();
		}, core.status.replay.speed == 24 ? 1 : 750 / Math.max(1, core.status.replay.speed));
		return true;
	}
	//函数修复，敌人不存在时返回空
	enemys.prototype.getEnemyInfo = function (enemy, hero, x, y, floorId) {
		if (enemy == null) return null;
		if (typeof enemy == 'string') enemy = core.material.enemys[enemy];
		if (!enemy) return null;
		return this.enemydata.getEnemyInfo(enemy, hero, x, y, floorId)
	}
	//缩略图不应该更新地图缓存
	maps.prototype._drawThumbnail_realDrawTempCanvas = function (floorId, blocks, options) {
		// 缩略图：背景
		this.drawBg(floorId, options);
		// 缩略图：事件
		this.drawEvents(floorId, blocks, options);
		// 缩略图：勇士
		if (options.heroLoc) {
			options.heroIcon = options.heroIcon || core.status.hero.image || 'hero.png';
			options.heroIcon = core.getMappedName(options.heroIcon);
			var icon = core.material.icons.hero[options.heroLoc.direction];
			var height = core.material.images.images[options.heroIcon].height / 4;
			var width = (core.material.images.images[options.heroIcon].width || 128) / 4;
			core.drawImage(options.ctx, core.material.images.images[options.heroIcon], icon.stop * width, icon.loc * height, width, height,
				32 * options.heroLoc.x + 32 - width, 32 * options.heroLoc.y + 32 - height, width, height);
		}
		// 缩略图：前景
		this.drawFg(floorId, options);
		// 缩略图：显伤
		if (options.damage && core.hasItem('book')) {
			core.updateCheckBlock(floorId);
			core.control.updateDamage(floorId, options.ctx);
		}

		// =========== 新增代码：清理缓存 ===========
		// 强制清除当前楼层的 bg/fg 缓存，防止缩略图生成的脏数据污染实际游戏
		if (core.status.bgmaps) core.status.bgmaps[floorId] = null;
		if (core.status.fgmaps) core.status.fgmaps[floorId] = null;
		// =======================================
	}
	events.prototype.openQuickShop = function (fromUserAction) {
		if (core.isReplaying()) return;
		if (!core.maps._canMoveDirectly_checkGlobal()) {
			core.playSound('操作失败');
			core.drawTip("当前无法使用快捷商店！");
			return;
		}

		if (Object.keys(core.status.shops).length == 0) {
			core.playSound('操作失败');
			core.drawTip("本游戏没有快捷商店！");
			return;
		}

		// --- 如果只有一个商店，则直接打开之
		if (Object.keys(core.status.shops).length == 1) {
			var shopId = Object.keys(core.status.shops)[0];
			if (core.status.event.id != null) return;
			if (!core.canOpenShop(shopId)) {
				core.playSound('操作失败');
				core.drawTip("当前无法打开快捷商店！");
				return;
			}
			var message = core.canUseQuickShop(shopId);
			if (message != null) {
				core.playSound('操作失败');
				core.drawTip(message);
				return;
			}
			core.openShop(shopId, false);
			return;
		}

		if (!this._checkStatus('selectShop', fromUserAction)) return;
		core.ui._drawQuickShop();
	}
	events.prototype.battle = function (id, x, y, force, callback) {
		core.saveAndStopAutomaticRoute();
		id = id || core.getBlockId(x, y);
		if (!id || !core.material.enemys[id]) return core.clearContinueAutomaticRoute(callback);
		// 非强制战斗
		if (!core.enemys.canBattle(id, x, y) && !force) {
			core.stopSound();
			core.playSound('操作失败');
			core.drawTip("你打不过此怪物！", id);
			return core.clearContinueAutomaticRoute(callback);
		}
		// 自动存档
		if (!core.status.event.id && x === core.nextX() && y === core.nextY()) core.plugin.autosaveFromSnapshot();
		// 战前事件
		if (!this.beforeBattle(id, x, y))
			return core.clearContinueAutomaticRoute(callback);
		// 战后事件
		this.afterBattle(id, x, y);
		if (callback) callback();
	}
	maps.prototype.noPass = function (x, y, floorId) {
		var block = core.getBlock(x, y, floorId);
		if (block == null) return false;
		if (block.event.cls === 'items') return true;

		return block.event.noPass;
	}
	control.prototype.moveAction = function (callback) {
		if (core.status.heroMoving > 0) return;
		var noPass = core.noPass(core.nextX(), core.nextY()),
			canMove = core.canMoveHero();

		if (core.getFlag('移动音效') && !core.isReplaying())
			core.playSound('移动');

		var cls = core.getBlockCls(core.nextX(), core.nextY());
		if (cls === 'items') {
			core.plugin.autosaveFromSnapshot();
		}
		// 下一个点如果不能走
		if (noPass || !canMove) return this._moveAction_noPass(canMove, callback);
		this._moveAction_moving(callback);
	}


	events.prototype.getItem = function (id, num, x, y, isGentleClick, callback) {
		if (x && y) {
			core.saveAndStopAutomaticRoute();
		}
		if (num == null) num = 1;
		var itemCls = core.material.items[id].cls;
		core.removeBlock(x, y);
		core.items.getItemEffect(id, num);


		var text = '得到 ' + core.material.items[id].name;
		if (num > 1) text += "x" + num;

		if (itemCls === 'items' && num == 1) text += core.items.getItemEffectTip(id);

		if (core.hasFlag('战斗动画')) {
			if (x && y)
				core.insertAction({ "type": "function", "async": true, "function": `function(){ core.plugin.showTextPopup("${text}") }` });
		} else {
			core.drawTip(text, id);
		}

		// --- 首次获得道具的提示
		if (!core.hasFlag("__itemHint__")) core.setFlag("__itemHint__", []);
		var itemHint = core.getFlag("__itemHint__");
		if (core.flags.itemFirstText && itemHint.indexOf(id) < 0 && itemCls != 'items') {
			var hint = core.material.items[id].text || "该道具暂无描述";
			try {
				hint = core.replaceText(hint);
			} catch (e) {}
			if (!core.status.event.id || core.status.event.id == 'action') {
				core.insertAction("\t[" + core.material.items[id].name + "," + id + "]" + hint + "\n" +
					(id.endsWith('Key') ? "（钥匙类道具，遇到对应的门时自动打开）" :
						itemCls == 'tools' ? "（消耗类道具，请按T在道具栏使用）" :
						itemCls == 'constants' ? "（永久类道具，请按T在道具栏使用）" :
						itemCls == 'equips' ? "（装备类道具，请按Q在装备栏进行装备）" : ""));
			}
			itemHint.push(id);
		}

		this.afterGetItem(id, x, y, isGentleClick);
		if (callback) callback();
	}
	items.prototype.useItem = function (itemId, noRoute, callback) {
		if (!this.canUseItem(itemId)) {
			if (callback) callback();
			return;
		}
		if (core.material.items[itemId].cls === 'tools') {
			if (noRoute) core.autosave(true);
			else core.autosave(false);
		}
		// 执行道具效果
		this._useItemEffect(itemId);
		// 执行完毕
		this._afterUseItem(itemId);
		// 记录路线
		if (!noRoute) {
			core.status.route.push("item:" + itemId);
		}
		if (callback) callback();
	}
	events.prototype._sys_battle = function (data, callback) {
		// 检查是否需要改变朝向
		/* if (data.x == core.nextX() && data.y == core.nextY()) {
		    var dir = core.turnDirection(":back");
		    var id = data.event.id, toId = (data.event.faceIds || {})[dir];
		    if (toId && id != toId) {
		        var number = core.getNumberById(toId);
		        if (number > 0)
		            core.setBlock(number, data.x, data.y);
		    }
		} */

		// 检查战前事件
		var beforeBattle = [];
		core.push(beforeBattle, core.floors[core.status.floorId].beforeBattle[data.x + "," + data.y]);
		core.push(beforeBattle, (core.material.enemys[data.event.id] || {}).beforeBattle);
		if (beforeBattle.length > 0) {
			core.push(beforeBattle, [{ "type": "function", "function": `function(){ core.battle("${core.getBlockId(data.x, data.y)}", ${data.x}, ${data.y}, false) }` }, ]);
			core.clearContinueAutomaticRoute();

			// 自动存档
			var inAction = core.status.event.id == 'action';
			if (inAction) {
				core.insertAction(beforeBattle, data.x, data.y);
				core.doAction();
			} else {
				core.autosave(true);
				core.insertAction(beforeBattle, data.x, data.y, callback);
			}
		} else {
			this.battle(data.event.id, data.x, data.y, false, callback);
		}
	}
	control.prototype._updateStatusBar_setToolboxIcon = function () {
		if (core.isReplaying()) {
			core.statusBar.image.book.src = core.status.replay.pausing ? core.statusBar.icons.play.src : core.statusBar.icons.pause.src;
			core.statusBar.image.book.style.opacity = 1;
			core.statusBar.image.fly.src = core.statusBar.icons.stop.src;
			core.statusBar.image.fly.style.opacity = 1;
			// 回放模式下清除可能的反色效果
			core.statusBar.image.fly.style.filter = '';
			core.statusBar.image.toolbox.src = core.statusBar.icons.rewind.src;
			core.statusBar.image.keyboard.src = core.statusBar.icons.book.src;
			core.statusBar.image.shop.src = core.statusBar.icons.floor.src;
			core.statusBar.image.save.src = core.statusBar.icons.speedDown.src;
			core.statusBar.image.save.style.opacity = 1;
			core.statusBar.image.load.src = core.statusBar.icons.speedUp.src;
			core.statusBar.image.settings.src = core.statusBar.icons.save.src;
		} else {
			core.statusBar.image.book.src = core.statusBar.icons.book.src;
			core.statusBar.image.book.style.opacity = core.hasItem('book') ? 1 : 0.3;
			if (!core.flags.equipboxButton) {
				core.statusBar.image.fly.src = core.statusBar.icons.fly.src;
				core.statusBar.image.fly.style.opacity = core.hasItem('fly') ? 1 : 0.3;

				if (core.hasItem('fly') && !core.getFlag('fly')) {
					core.statusBar.image.fly.style.filter = 'invert(1)'; // 反色效果
				} else {
					core.statusBar.image.fly.style.filter = ''; // 清除反色效果
				}
			} else {
				core.statusBar.image.fly.src = core.statusBar.icons.equipbox.src;
				core.statusBar.image.fly.style.opacity = 1;
				// 使用装备箱按钮时清除反色效果
				core.statusBar.image.fly.style.filter = '';
			}
			core.statusBar.image.help.src = core.statusBar.icons.help.src;
			core.statusBar.image.toolbox.src = core.statusBar.icons.toolbox.src;
			core.statusBar.image.keyboard.src = core.statusBar.icons.keyboard.src;
			core.statusBar.image.shop.src = core.statusBar.icons.shop.src;
			core.statusBar.image.save.src = core.statusBar.icons.save.src;
			core.statusBar.image.save.style.opacity = core.hasFlag('__forbidSave__') ? 0.3 : 1;
			core.statusBar.image.load.src = core.statusBar.icons.load.src;
			core.statusBar.image.settings.src = core.statusBar.icons.settings.src;
		}
	}
	control.prototype.setToolbarButton = function (useButton) {
		if (!core.domStyle.showStatusBar) {
			// 隐藏状态栏时检查竖屏
			if (!core.domStyle.isVertical && !core.flags.extendToolbar) {
				for (var i = 0; i < core.dom.tools.length; ++i)
					core.dom.tools[i].style.display = 'none';
				return;
			}
			if (!core.hasFlag('showToolbox')) return;
			else core.dom.tools.hard.style.display = 'block';
		}

		if (useButton == null) useButton = core.domStyle.toolbarBtn;
		if ((!core.domStyle.isVertical && !core.flags.extendToolbar) || core.isReplaying()) useButton = false;
		core.domStyle.toolbarBtn = useButton;

		if (useButton) {
			["book", "fly", "help", "toolbox", "keyboard", "shop", "save", "load", "settings"].forEach(function (t) {
				core.statusBar.image[t].style.display = 'none';
			});
			["btn1", "btn2", "btn3", "btn4", "btn5", "btn6", "btn7", "btn8"].forEach(function (t) {
				core.statusBar.image[t].style.display = 'block';
			})
			main.statusBar.image.btn8.style.filter = core.getLocalStorage('altKey') ? 'sepia(1) contrast(1.5)' : '';
		} else {
			["btn1", "btn2", "btn3", "btn4", "btn5", "btn6", "btn7", "btn8"].forEach(function (t) {
				core.statusBar.image[t].style.display = 'none';
			});
			["book", "fly", "help", "toolbox", "save", "load", "settings"].forEach(function (t) {
				core.statusBar.image[t].style.display = 'block';
			});
			core.statusBar.image.keyboard.style.display = core.statusBar.image.shop.style.display = core.domStyle.isVertical || core.flags.extendToolbar ? "block" : "none";
		}
	}
	// helper: 判断 localStorage 中 autoScale 是否为真
	function _isAutoScaleEnabled() {
		var v = core.getLocalStorage('autoScale');
		// 兼容 boolean 或字符串 'true'
		return v === true || v === 'true';
	}

	// -------------- 修改后的 resize --------------
	// -------------- 修改后的 resize --------------
	control.prototype.resize = function () {
		if (main.mode == 'editor') return;

		var clientWidth = main.dom.body.clientWidth,
			clientHeight = main.dom.body.clientHeight;
		var BORDER = 3;
		var extendToolbar = core.flags.extendToolbar;
		var hideLeftStatusBar = core.flags.hideLeftStatusBar;

		// 两种方向下的侧栏宽度策略
		var BAR_WIDTH_LAND = hideLeftStatusBar ? 0 : Math.round(core._PY_ * 0.31);
		var BAR_WIDTH_VERT = hideLeftStatusBar ? 0 : Math.round(core._PX_ * 0.3);

		const SCALES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];

		// 横向约束（沿用原逻辑）
		var horizontalMaxRatio = (clientHeight - 2 * BORDER - (hideLeftStatusBar ? BORDER : 0)) / (core._PY_ + (hideLeftStatusBar ? 38 : 0));
		var availLand = [];
		SCALES.forEach(function (v) {
			if (clientWidth - 3 * BORDER >= v * (core._PX_ + BAR_WIDTH_LAND) && horizontalMaxRatio >= v) {
				availLand.push(v);
			}
		});

		// 先计算状态栏相关参数，用于竖向高度计算
		var statusDisplayArr = this._shouldDisplayStatus(),
			count = statusDisplayArr.length;
		var statusCanvas = core.flags.statusCanvas,
			statusCanvasRows = core.values.statusCanvasRowsOnMobile || 3;
		var col = statusCanvas ? statusCanvasRows : Math.ceil(count / 3);

		// 竖向约束（修正：考虑状态栏和工具栏的高度）
		var availVert = [];
		SCALES.forEach(function (v) {
			// 游戏区域宽度
			var needWidth = v * core._PX_ + 2 * BORDER;

			// 总高度 = 工具栏 + 游戏区域 + 状态栏
			// 工具栏高度：38 * v + 2 * BORDER
			// 游戏区域高度：v * core._PY_ + 2 * BORDER
			// 状态栏高度：(32 * col + 6) * v + 2 * BORDER
			var toolbarHeight = 38 * v + 2 * BORDER;
			var gameHeight = v * core._PY_ + 2 * BORDER;
			var statusBarHeight = (32 * col + 6) * v + 2 * BORDER;
			var needHeight = toolbarHeight + gameHeight + statusBarHeight;

			// 去掉重复的边框（相邻区域共享边框）
			// 实际需要的边框：顶部1个，工具栏-游戏区域之间0个，游戏区域-状态栏之间0个，底部1个 = 2个BORDER
			// 每个组件都有上下2个BORDER，相邻的会重叠，所以需要减去重叠的边框
			needHeight = toolbarHeight + gameHeight + statusBarHeight - 4 * BORDER;

			if (clientWidth >= needWidth && clientHeight >= needHeight) {
				availVert.push(v);
			}
		});

		// 选择 "最佳方向+缩放候选列表"（用于 availableScale）
		var best = { isVertical: null, scale: null, area: 0, availableScale: [] };

		if (availLand.length > 0) {
			var maxVLand = availLand[availLand.length - 1];
			var areaLand = maxVLand * maxVLand * core._PX_ * core._PY_;
			best.isVertical = false;
			best.scale = maxVLand;
			best.area = areaLand;
			best.availableScale = availLand.slice();
		}

		if (availVert.length > 0) {
			var maxVVert = availVert[availVert.length - 1];
			var areaVert = maxVVert * maxVVert * core._PX_ * core._PY_;
			if (areaVert > best.area) {
				best.isVertical = true;
				best.scale = maxVVert;
				best.area = areaVert;
				best.availableScale = availVert.slice();
			}
		}

		// 若都没有候选 scale，则使用连续估算并选择更优方向（回退）
		if (best.isVertical === null) {
			var landScaleByWidth = (clientWidth - 3 * BORDER) / (core._PX_ + BAR_WIDTH_LAND);
			var landScaleByHeight = horizontalMaxRatio;
			var landScale = Math.min(landScaleByWidth, landScaleByHeight);
			if (landScale < 0) landScale = 0;

			// 竖向模式估算也要考虑状态栏和工具栏高度
			var vertScaleByWidth = (clientWidth - 2 * BORDER) / core._PX_;
			// 可用高度 = 总高度 - (工具栏高度 + 状态栏高度 + 必要的边框)
			// 简化估算：总高度减去固定组件的基本高度
			var totalVerticalHeight = clientHeight - 2 * BORDER; // 去掉顶部和底部的边框
			var fixedComponentsHeight = (38 + 32 * col + 6) * 1; // 用基准缩放1计算固定组件高度
			var availableGameHeight = totalVerticalHeight - fixedComponentsHeight;
			var vertScaleByHeight = availableGameHeight / core._PY_;

			var vertScale = Math.min(vertScaleByWidth, vertScaleByHeight);
			if (vertScale < 0) vertScale = 0;

			var areaLandEstimate = landScale * landScale * core._PX_ * core._PY_;
			var areaVertEstimate = vertScale * vertScale * core._PX_ * core._PY_;

			if (areaVertEstimate > areaLandEstimate) {
				best.isVertical = true;
				var candidate = SCALES.filter(v => v <= vertScale);
				best.availableScale = candidate;
				best.scale = candidate.length ? candidate[candidate.length - 1] : Math.max(0.5, vertScale);
			} else {
				best.isVertical = false;
				var candidate2 = SCALES.filter(v => v <= landScale);
				best.availableScale = candidate2;
				best.scale = candidate2.length ? candidate2[candidate2.length - 1] : Math.max(0.5, landScale);
			}
		}

		// 不论 autoScale 与否，都将 availableScale 写入以供 UI 使用
		core.domStyle.availableScale = best.availableScale.slice();

		// 仅当 autoScale 开启时，才把自动选定的 scale 写回 domStyle.scale
		var autoScaleEnabled = _isAutoScaleEnabled();
		if (autoScaleEnabled) {
			core.domStyle.scale = (typeof best.scale === 'number' && isFinite(best.scale) && best.scale > 0) ? best.scale : 1;
		} else {
			// autoScale 关闭：尝试读取用户保存的 scale（localStorage），若不存在则保持当前 core.domStyle.scale
			var userScale = core.getLocalStorage('scale');
			if (typeof userScale === 'string') {
				// 尝试把字符串转成数字
				var parsed = parseFloat(userScale);
				if (!isNaN(parsed) && parsed > 0) userScale = parsed;
			}
			if (typeof userScale === 'number' && isFinite(userScale) && userScale > 0) {
				// 如果当前 availableScale 非空且 userScale 不在其中，则将其钳制到最近的可用 scale（避免界面溢出）
				if (core.domStyle.availableScale && core.domStyle.availableScale.length > 0) {
					var arr = core.domStyle.availableScale;
					var nearest = arr.reduce(function (bestV, cur) {
						return Math.abs(cur - userScale) < Math.abs(bestV - userScale) ? cur : bestV;
					}, arr[0]);
					core.domStyle.scale = nearest;
				} else {
					// 没有可用 scale 列表时，直接使用 userScale（仍可能导致部分溢出）
					core.domStyle.scale = userScale;
				}
			} else {
				// 无 userScale；保持已有 core.domStyle.scale 或退回到默认 1
				core.domStyle.scale = (typeof core.domStyle.scale === 'number' && core.domStyle.scale > 0) ? core.domStyle.scale : 1;
			}
		}

		// 应用方向相关的局部变量（保留你原先的行为）
		core.domStyle.isVertical = !!best.isVertical;
		if (core.domStyle.isVertical) {
			extendToolbar = false;
			hideLeftStatusBar = false;
			var BAR_WIDTH = BAR_WIDTH_VERT;
		} else {
			var BAR_WIDTH = BAR_WIDTH_LAND;
		}

		// 保留你的状态栏检测逻辑
		if (col > 5) {
			if (statusCanvas) alert("自绘状态栏的在竖屏下的行数应不超过5！");
			else alert("当前状态栏数目(" + count + ")大于15，请调整到不超过15以避免手机端出现显示问题。");
		}
		var globalAttribute = core.status.globalAttribute || core.initStatus.globalAttribute;

		var obj = {
			clientWidth: clientWidth,
			clientHeight: clientHeight,
			BORDER: BORDER,
			BAR_WIDTH: BAR_WIDTH,
			TOOLBAR_HEIGHT: 38,
			outerWidth: core._PX_ * core.domStyle.scale + 2 * BORDER,
			outerHeight: core._PY_ * core.domStyle.scale + 2 * BORDER,
			globalAttribute: globalAttribute,
			border: '3px ' + core.arrayToRGBA(globalAttribute.borderColor) + ' solid',
			statusDisplayArr: statusDisplayArr,
			count: count,
			col: col,
			statusBarHeightInVertical: core.domStyle.isVertical ? (32 * col + 6) * core.domStyle.scale + 2 * BORDER : 0,
			toolbarHeightInVertical: core.domStyle.isVertical ? 38 * core.domStyle.scale + 2 * BORDER : 0,
			extendToolbar: extendToolbar,
			is15x15: false,
			hideLeftStatusBar: hideLeftStatusBar
		};

		this._doResize(obj);
		this.setToolbarButton();
		core.updateStatusBar();
	};

	// -------------- 修改后的 setDisplayScale --------------
	// delta: 步进（正数向后，负数向前）
	// 手动设置缩放时：
	// 1) 若当前 availableScale 中存在当前 scale 则按数组循环；
	// 2) 若 current scale 不在 availableScale，则寻找 nearest index 起点；
	// 3) 手动改变会关闭 autoScale（并持久化），把新的 scale 存到 localStorage，并触发 resize。
	control.prototype.setDisplayScale = function (delta) {
		// 关闭自动调整（用户手动调整优先）
		core.setLocalStorage('autoScale', false);

		// 确保 availableScale 可用（resize 会在之后被调用，availableScale 应由 resize 更新，但在某些情形下可能为空）
		var arr = core.domStyle.availableScale || [];

		// 如果没有候选 scale，则把当前 scale 保证为数值并直接 +/- 一个微量并保存（极端回退）
		if (!arr || arr.length === 0) {
			var current = parseFloat(core.domStyle.scale) || 1;
			// 选择一个常规步长：如果 delta 为正则乘以 1.25 的等级循环否则除以
			var next = current;
			if (delta > 0) next = current * 1.25;
			else if (delta < 0) next = current / 1.25;
			core.domStyle.scale = Math.max(0.1, next);
			core.setLocalStorage('scale', core.domStyle.scale);
			core.resize();
			return;
		}

		// 在可用列表中找到当前 index（或找到最接近的起点）
		var currentIndex = arr.indexOf(core.domStyle.scale);
		if (currentIndex < 0) {
			// 找到最接近的 index 作为起点
			var nearestIdx = 0;
			var bestDiff = Math.abs(arr[0] - core.domStyle.scale);
			for (var i = 1; i < arr.length; i++) {
				var d = Math.abs(arr[i] - core.domStyle.scale);
				if (d < bestDiff) {
					bestDiff = d;
					nearestIdx = i;
				}
			}
			currentIndex = nearestIdx;
		}

		var newIndex = (currentIndex + delta + arr.length) % arr.length;
		core.domStyle.scale = arr[newIndex];
		core.setLocalStorage('scale', core.domStyle.scale);
		core.resize();
	};



	maps.prototype._drawFg_draw = function (floorId, toDrawCtx, cacheCtx, config) {
		config.ctx = cacheCtx;
		// ------ 调整这两行的顺序来控制是先绘制贴图还是先绘制前景图块；后绘制的覆盖先绘制的。
		core.maps._drawFloorImages(floorId, config.ctx, 'fg', null, null, config.onMap);
		core.maps._drawBgFgMap(floorId, 'fg', config);
		if (config.onMap) core.drawImage(toDrawCtx, cacheCtx.canvas, core.bigmap.v2 ? -32 : 0, core.bigmap.v2 ? -32 : 0);
		config.ctx = toDrawCtx;

		core.strokeRect(toDrawCtx, 32, 32, 352, 352, "#cc6600", 3);
	}

	ui.prototype.clearMap = function (name, x, y, width, height) {
		if (name == 'all') {
			for (var m in core.canvas) {
				core.canvas[m].clearRect(-32, -32, core.canvas[m].canvas.width + 32, core.canvas[m].canvas.height + 32);
			}
			core.dom.gif.innerHTML = "";
			core.removeGlobalAnimate();
			core.deleteCanvas(function (one) { return one.startsWith('_bigImage_'); });
			core.setWeather(null);
		} else {
			var ctx = this.getContextByName(name);
			var ctx = this.getContextByName(name);
			if (ctx) {
				if (x != null && y != null && width != null && height != null) {
					// 如果指定了局部区域，通常是逻辑坐标，直接清空即可
					ctx.clearRect(x, y, width, height);
				} else {
					// 【修改重点】全局清理
					// 保存当前的绘图状态（包含缩放、位移等矩阵信息）
					ctx.save();

					// 重置变换矩阵为单位矩阵 (1像素 = 1物理像素)
					// 这样 clearRect 就直接操作物理像素了，不受之前 ctx.scale 的干扰
					ctx.setTransform(1, 0, 0, 1, 0, 0);

					// 清理整个物理画布
					ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

					// 恢复之前的绘图状态（恢复缩放设置，以免影响后续绘制）
					ctx.restore();
				}
			}
		}
	}
	this._convertShop_replaceChoices = function (shopId, previewMode) {
		var shop = core.status.shops[shopId];
		var choices = (shop.choices || []).filter(function (choice) {
			if (choice.condition == null || choice.condition == '') return true;
			try { return core.calValue(choice.condition); } catch (e) { return true; }
		}).map(function (choice) {
			var ableToBuy = core.calValue(choice.need);
			return {
				"text": choice.text,
				"icon": choice.icon,
				"color": ableToBuy && !previewMode ? choice.color : [153, 153, 153, 1],
				"action": ableToBuy && !previewMode ? [{ "type": "playSound", "name": "商店购买" }].concat(choice.action) : [
					{ "type": "playSound", "name": "操作失败" },
					{ "type": "tip", "text": previewMode ? "预览模式下不可购买" : "购买条件不足" }
				]
			};
		}).concat({ "text": "离开", "action": [{ "type": "playSound", "name": "商店离开" }, { "type": "break" }] });
		core.insertAction({ "type": "choices", "text": shop.text, "choices": choices });
	}

},
    "animate": function () {
	// -------------------- 插件说明 -------------------- //

	// github仓库：https://github.com/unanmed/animate
	// npm包名：mutate-animate
	// npm地址：https://www.npmjs.com/package/mutate-animate

	// 不要去尝试读这个插件，这个插件是经过了打包的，不是人类可读的(
	// 想读的话可以去github读

	// 该插件是一个轻量型多功能动画插件，可以允许你使用内置或自定义的速率曲线或轨迹等
	// 除此之外，你还可以自定义绘制函数，来让你的动画可视化

	// -------------------- 安装说明 -------------------- //

	// 直接复制到插件中即可，注意所有插件中不能出现插件名为animate的插件
	// 该插件分为动画和渐变两部分，教程分开，动画在前，渐变在后

	// -------------------- 动画使用教程 -------------------- //

	// 1. 首先创建一个异步函数
	//   async function ani() { }

	// 2. 引入插件中的类和函数，引入内容要看个人需求，所有可用的函数在本插件末尾可以看到
	//   const { Animation, linear, bezier, circle, hyper, trigo, power, inverseTrigo, shake, sleep } = core.plugin.animate

	// 3. 在函数内部创建一个动画
	//   const animate = new Animation();

	// 4. 为动画创建一个绘制函数，这里以绘制一个矩形为例，当然也可以使用core.fillRect替代ctx.fillRect来绘制矩形
	//   const ctx = core.createCanvas('animate', 0, 0, 416, 416, 100);
	//   ctx.save();
	//   const fn = () => {
	//      ctx.restore();
	//      ctx.save();
	//      ctx.clearRect(0, 0, 800, 800);
	//      ctx.translate(animate.x, animate.y);
	//      ctx.rotate(animate.angle * Math.PI / 180);
	//      const size = animate.size;
	//      ctx.fillRect(-30 * size, -30 * size, 60 * size, 60 * size);
	//   }
	//   animate.ticker.add(fn);

	// 5. 执行动画

	//   下面先对一些概念进行解释

	//   动画分为很多种，内置的有move(移动至某一点)  rotate(旋转)  scale(放缩)  moveAs(以指定路径移动)  shake(震动)
	//   对于不同的动画种类，其所对应的属性也不同，move moveAs shake均对应x和y这两个属性
	//   rotate对应angle，scale对应size。你也可以自定义属性，这个之后会提到

	//   除了执行动画之外，这里还提供了三个等待函数，可以等待某个动画执行完毕，以及一个等待指定时长的函数
	//   分别是animate.n(等待指定数量的动画执行完毕)
	//   animate.w(等待指定类型的动画执行完毕，也可以是自定义类型)
	//   animate.all(等待所有动画执行完毕)
	//   sleep(等待指定时长)

	//   执行动画时，要求一个渐变函数，当然这个插件内置了非常丰富的渐变函数，也就是速率曲线。

	//   线性渐变函数  linear()，该函数返回一个线性变化函数

	//   三角渐变函数  trigo('sin' | 'sec', EaseMode)，该函数返回一个指定属性的三角函数变化函数
	//       其中EaseMode可以填'in' 'out' 'in-out' 'center'
	//       分别表示 慢-快  快-慢  慢-快-慢  快-慢-快

	//   幂函数渐变  power(n, EaseMode)，该函数返回一个以x^n变化的函数，n是指数

	//   双曲渐变函数  hyper('sin' | 'tan' | 'sec', EaseMode)，该函数返回一个双曲函数，分别是双曲正弦、双曲正切、双曲正割

	//   反三角渐变函数  inverseTrigo('sin' | 'tan', EaseMode)，该函数返回一个反三角函数

	//   贝塞尔曲线渐变函数  bezier(...cps)，参数为贝塞尔曲线的控制点纵坐标（横坐标不能自定义，毕竟一个时刻不能对应多个速率）
	//       示例：bezier(0.4, 0.2, 0.7); // 三个控制点的四次贝塞尔曲线渐变函数

	//   了解完渐变函数以后，这里还有一个特殊的渐变函数-shake
	//   shake(power, timing)，这个函数是一个震荡函数，会让一个值来回变化，实现震动的效果
	//       其中power是震动的最大值，timing是渐变函数，描述了power在震动时大小的变化

	//   下面，我们就可以进行动画的执行了，我们以 运动 + 旋转 + 放缩为例

	//   animate.mode(hyper('sin', 'out'))  // 设置渐变函数为 双曲正弦 快 -> 慢，注意不能加分号
	//       .time(1000)  // 设置动画的执行时间为1000毫秒
	//       .move(300, 300)  // 移动至[300, 300]的位置
	//       .relative()  // 设置相对模式为相对之前，与之前为相加的关系
	//       .mode(power(3, 'center'))  // 设置为 x^3 快-慢-快 的渐变函数
	//       .time(3000)
	//       .rotate(720)  // 旋转720度
	//       .absolute()  // 设置相对模式为绝对
	//       .mode(trigo('sin', 'in'))  // 设置渐变函数为 正弦 慢 -> 快
	//       .time(1500)
	//       .scale(3);  // 放缩大小至3倍

	//   这样，我们就把三种基础动画都执行了一遍，同时，这种写法非常直观，出现问题时也可以很快地找到问题所在
	//   下面，我们需要等待动画执行完毕，因为同一种动画不可能同时执行两个

	//   await animate.n(1); // 等待任意一个动画执行完毕，别把await忘了
	//   await animate.w('scale'); // 等待放缩动画执行完毕
	//   await animate.all(); // 等待所有动画执行完毕
	//   await sleep(1000); // 等待1000毫秒

	//   下面，还有一个特殊的动画函数-moveAs
	//   这是一个非常强大的函数，它允许你让你的物体按照指定路线运动
	//   说到这，我们需要先了解一下运动函数。
	//   该插件内置了两个运动函数，分别是圆形运动和贝塞尔曲线运动

	//   圆形运动 circle(r, n, timing, inverse)，r是圆的半径，n是圈数，timing描述半径大小的变化，inverse说明了是否翻转timing函数，后面三个可以不填

	//   贝塞尔曲线 bezierPath(start, end, ...cps)
	//       其中start和end是起点和结束点，应当填入[x, y]数组，cps是控制点，也是[x, y]数组
	//       示例：bezierPath([0, 0], [200, 200], [100, 50], [300, 150], [200, 180]);
	//       这是一个起点为 [0, 0]，终点为[200, 200]，有三个控制点的四次贝塞尔曲线

	//   下面，我们就可以使用路径函数了

	//   animate.mode(hyper('sin', 'in-out'))  // 设置渐变曲线
	//       .time(5000)
	//       .relative()  // 设置为相对模式，这个比较必要，不然的话很可能出现瞬移
	//       .moveAs(circle(100, 5, linear()))  // 创建一个5圈的半径从0至100逐渐变大的圆轨迹（是个螺旋线）并让物体沿着它运动
	//
	//   最后，还有一个震动函数 shake(x, y)，x和y表示了在横向上和纵向上的震动幅度，1表示为震动幅度的100%
	//   示例：
	//   animate.mode(shake(5, hyper('sin', 'in')), true) // 这里第二个参数说明是震动函数
	//       .time(2000)
	//       .shake(1, 0.5)

	//   这样，所有内置动画就已经介绍完毕

	// 6. 自定义动画属性

	//   本插件允许你自定义一个动画属性，但功能可能不会像自带的属性那么强大
	//   你可以在创建动画之后使用animate.register(key, init)来注册一个自定义属性
	//   其中key是自定义属性的名称，init是自定义属性的初始值，这个值应当在0-1之间变化

	//   你可以通过animate.value[key]来获取你注册的自定义属性

	//   对于自定义属性的动画，你应当使用animate.apply(key, n, first)
	//   其中，key是你的自定义属性的名称，n是其目标值，first是一个布尔值，说明了是否将该动画插入到目前所有的动画之前，即每帧会优先执行该动画

	//   下面是一个不透明度的示例

	//   animate.register('opacity', 1); // 这句话应该放到刚创建动画之后

	//   ctx.globalAlpha = animate.value.opacity; // 这句话应当放到每帧绘制的函数里面，放在绘制之前

	//   animate.mode(bezier(0.9, 0.1, 0.05))  // 设置渐变函数
	//       .time(2000)
	//       .absolute()
	//       .apply('opacity', 0.3);  // 将不透明度按照渐变曲线更改为0.3

	// 7. 运行动画

	//   还记得刚开始定义的async function 吗，直接调用它就能执行动画了！
	//   示例：ani(); // 执行刚刚写的所有动画

	// 8. 自定义速率曲线和路径

	//   该插件中，速率曲线和路径均可自定义

	//   对于速率曲线，其类型为  (input: number) => number
	//   它接受一个范围在 0-1 的值，输出一个 0-1 的值，表示了动画的完成度，1表示动画已完成，0表示动画刚开始（当前大于1小于0也不会报错，也会执行相应的动画）

	//   对于路径，其类型为  (input: number) => [number, number]
	//   它与速率曲线类似，接收一个 0-1 的值，输出一个坐标数组

	// 9. 多个属性绑定

	//   该插件中，你可以绑定多个动画属性，你可以使用ani.bind(...attr)来绑定。
	//   绑定之后，这三个动画属性可以被一个返回了长度为3的数组的渐变函数执行。
	//   绑定使用ani.bind，设置渐变函数仍然使用ani.mode，注意它与单个动画属性是分开的，也就是它不会影响正常的渐变函数。
	//   然后使用ani.applyMulti即可执行动画

	//   例如：
	//   // 自定义的一个三属性渐变函数
	//   function b(input) {
	//       return [input * 100, input ** 2 * 100, input ** 3 * 100];
	//   }
	//   ani.bind('a', 'b', 'c') // 这样会绑定abc这三个动画属性
	//       .mode(b) // 自定义的一个返回了长度为3的数组的函数
	//       .time(5000)
	//       .absolute()
	//       .applyMulti(); // 执行这个动画

	// 9. 监听  动画的生命周期钩子

	//   这个插件还允许你去监听动画的状态，可以监听动画的开始、结束、运行
	//   你可以使用 animate.listen(type, fn)来监听，fn的类型是 (a: Animation, type: string) => void
	//   当然，一般情况下你不会用到这个功能，插件中已经帮你包装了三个等待函数，他们就是以这些监听为基础的

	// 10. 自定义时间获取函数

	//   你可以修改ani.getTime来修改动画的时间获取函数，例如想让动画速度变成一半可以写ani.getTime = () => Date.now() / 2
	//   这样可以允许你随意控制动画的运行速度，暂停，甚至是倒退。该值默认为`Date.now`

	// -------------------- 渐变使用教程 -------------------- //

	// 相比于动画，渐变属于一种较为简便的动画，它可以让你在设置一个属性后使属性缓慢变化值目标值而不是突变至目标值
	// 现在假设你已经了解了动画的使用，下面我们来了解渐变。

	// 1. 创建一个渐变实例
	//   与动画类似，你需要使用new来实例化一个渐变，当然别忘了引入
	//   const { Transition } = core.plugin.animate;
	//   const tran = new Transition();

	// 2. 绘制
	//   const ctx = core.createCanvas('transition', 0, 0, 416, 416, 100);
	//   ctx.save();
	//   const fn = () => {
	//      ctx.restore();
	//      ctx.save();
	//      ctx.clearRect(0, 0, 800, 800);
	//      ctx.beginPath();
	//      ctx.arc(tran.value.x, tran.value.y, 50, 0, Math.PI * 2); // 使用tran.value.xxx获取当前的属性
	//      ctx.fill();
	//      // 当然也可以用样板的api，例如core.fillCircle();等
	//   }
	//   animate.ticker.add(fn);

	// 3. 设置渐变
	//   同样，与动画类似，你可以使用tran.time()设置渐变时间，使用tran.mode()设置渐变函数，使用tran.absolute()和tran.relative()设置相对模式
	//   例如：
	//   tran.time(1000)
	//       .mode(hyper('sin', 'out'))
	//       .absolute();

	// 4. 初始化渐变属性
	//   与动画不同的是，动画在执行一个自定义属性前都需要register，而渐变不需要。
	//   你可以通过tran.value.xxx = yyy来设置动画属性或使用tran.transition('xxx', yyy)来设置
	//   你的首次赋值即是初始化了渐变属性，这时是不会执行渐变的，例如：
	//   tran.value.x = 200;
	//   tran.transition('y', 200);
	//   上述例子便是将 x 和 y 初始化成了200

	// 5. 执行渐变
	//   初始化完成后，便可以直接执行渐变了，有两种方法
	//   tran.value.x = 400; // 将 x 缓慢移动至400
	//   tran.transition('y', 400); // 将 y 缓慢移动至400

	// 6. 自定义时间获取函数
	//   与动画类似，你依然可以通过修改tran.getTime来修改时间获取函数

	if (main.replayChecking) return (core.plugin.animate = {});

	var M = Object.defineProperty;
	var E = (n, s, t) =>
		s in n ?
		M(n, s, { enumerable: !0, configurable: !0, writable: !0, value: t }) :
		(n[s] = t);
	var o = (n, s, t) => (E(n, typeof s != "symbol" ? s + "" : s, t), t);
	let b = [];
	const k = (n) => {
		for (const s of b)
			if (s.status === "running")
				try {
					for (const t of s.funcs) t(n - s.startTime);
				} catch (t) {
					s.destroy(), console.error(t);
				}
		requestAnimationFrame(k);
	};
	requestAnimationFrame(k);
	class I {
		constructor() {
			o(this, "funcs", []);
			o(this, "status", "stop");
			o(this, "startTime", 0);
			(this.status = "running"),
			b.push(this),
				requestAnimationFrame((s) => (this.startTime = s));
		}
		add(s, t = !1) {
			return t ? this.funcs.unshift(s) : this.funcs.push(s), this;
		}
		remove(s) {
			const t = this.funcs.findIndex((e) => e === s);
			if (t === -1)
				throw new ReferenceError(
					"You are going to remove nonexistent ticker function."
				);
			return this.funcs.splice(t, 1), this;
		}
		clear() {
			this.funcs = [];
		}
		destroy() {
			this.clear(), this.stop();
		}
		stop() {
			(this.status = "stop"), (b = b.filter((s) => s !== this));
		}
	}
	class F {
		constructor() {
			o(this, "timing");
			o(this, "relation", "absolute");
			o(this, "easeTime", 0);
			o(this, "applying", {});
			o(this, "getTime", Date.now);
			o(this, "ticker", new I());
			o(this, "value", {});
			o(this, "listener", {});
			this.timing = (s) => s;
		}
		async all() {
			if (Object.values(this.applying).every((s) => s === !0))
				throw new ReferenceError("There is no animates to be waited.");
			await new Promise((s) => {
				const t = () => {
					Object.values(this.applying).every((e) => e === !1) &&
						(this.unlisten("end", t), s("all animated."));
				};
				this.listen("end", t);
			});
		}
		async n(s) {
			const t = Object.values(this.applying).filter((i) => i === !0).length;
			if (t < s)
				throw new ReferenceError(
					`You are trying to wait ${s} animate, but there are only ${t} animate animating.`
				);
			let e = 0;
			await new Promise((i) => {
				const r = () => {
					e++, e === s && (this.unlisten("end", r), i(`${s} animated.`));
				};
				this.listen("end", r);
			});
		}
		async w(s) {
			if (this.applying[s] === !1)
				throw new ReferenceError(`The ${s} animate is not animating.`);
			await new Promise((t) => {
				const e = () => {
					this.applying[s] === !1 &&
						(this.unlisten("end", e), t(`${s} animated.`));
				};
				this.listen("end", e);
			});
		}
		listen(s, t) {
			var e, i;
			(i = (e = this.listener)[s]) != null || (e[s] = []),
				this.listener[s].push(t);
		}
		unlisten(s, t) {
			const e = this.listener[s].findIndex((i) => i === t);
			if (e === -1)
				throw new ReferenceError(
					"You are trying to remove a nonexistent listener."
				);
			this.listener[s].splice(e, 1);
		}
		hook(...s) {
			const t = Object.entries(this.listener).filter((e) => s.includes(e[0]));
			for (const [e, i] of t)
				for (const r of i) r(this, e);
		}
	}

	function T(n) {
		return n != null;
	}
	async function R(n) {
		return new Promise((s) => setTimeout(s, n));
	}
	class Y extends F {
		constructor() {
			super();
			o(this, "shakeTiming");
			o(this, "path");
			o(this, "multiTiming");
			o(this, "value", {});
			o(this, "size", 1);
			o(this, "angle", 0);
			o(this, "targetValue", {
				system: {
					move: [0, 0],
					moveAs: [0, 0],
					resize: 0,
					rotate: 0,
					shake: 0,
					"@@bind": [],
				},
				custom: {},
			});
			o(this, "animateFn", {
				system: {
					move: [() => 0, () => 0],
					moveAs: () => 0,
					resize: () => 0,
					rotate: () => 0,
					shake: () => 0,
					"@@bind": () => 0,
				},
				custom: {},
			});
			o(this, "ox", 0);
			o(this, "oy", 0);
			o(this, "sx", 0);
			o(this, "sy", 0);
			o(this, "bindInfo", []);
			(this.timing = (t) => t),
			(this.shakeTiming = (t) => t),
			(this.multiTiming = (t) => [t, t]),
			(this.path = (t) => [t, t]),
			(this.applying = {
				move: !1,
				scale: !1,
				rotate: !1,
				shake: !1,
			}),
			this.ticker.add(() => {
				const { running: t } = this.listener;
				if (T(t))
					for (const e of t) e(this, "running");
			});
		}
		get x() {
			return this.ox + this.sx;
		}
		get y() {
			return this.oy + this.sy;
		}
		mode(t, e = !1) {
			return (
				typeof t(0) == "number" ?
				e ?
				(this.shakeTiming = t) :
				(this.timing = t) :
				(this.multiTiming = t),
				this
			);
		}
		time(t) {
			return (this.easeTime = t), this;
		}
		relative() {
			return (this.relation = "relative"), this;
		}
		absolute() {
			return (this.relation = "absolute"), this;
		}
		bind(...t) {
			return (
				this.applying["@@bind"] === !0 && this.end(!1, "@@bind"),
				(this.bindInfo = t),
				this
			);
		}
		unbind() {
			return (
				this.applying["@@bind"] === !0 && this.end(!1, "@@bind"),
				(this.bindInfo = []),
				this
			);
		}
		move(t, e) {
			return (
				this.applying.move && this.end(!0, "move"),
				this.applySys("ox", t, "move"),
				this.applySys("oy", e, "move"),
				this
			);
		}
		rotate(t) {
			return this.applySys("angle", t, "rotate"), this;
		}
		scale(t) {
			return this.applySys("size", t, "resize"), this;
		}
		shake(t, e) {
			this.applying.shake === !0 && this.end(!0, "shake"),
				(this.applying.shake = !0);
			const { easeTime: i, shakeTiming: r } = this,
			h = this.getTime();
			if ((this.hook("start", "shakestart"), i <= 0))
				return this.end(!1, "shake"), this;
			const l = () => {
				const c = this.getTime() - h;
				if (c > i) {
					this.ticker.remove(l),
						(this.applying.shake = !1),
						(this.sx = 0),
						(this.sy = 0),
						this.hook("end", "shakeend");
					return;
				}
				const a = c / i,
					m = r(a);
				(this.sx = m * t), (this.sy = m * e);
			};
			return this.ticker.add(l), (this.animateFn.system.shake = l), this;
		}
		moveAs(t) {
			this.applying.moveAs && this.end(!0, "moveAs"),
				(this.applying.moveAs = !0),
				(this.path = t);
			const { easeTime: e, relation: i, timing: r } = this,
			h = this.getTime(),
				[l, u] = [this.x, this.y],
				[c, a] = (() => {
					if (i === "absolute") return t(1); {
						const [d, f] = t(1);
						return [l + d, u + f];
					}
				})();
			if ((this.hook("start", "movestart"), e <= 0))
				return this.end(!1, "moveAs"), this;
			const m = () => {
				const f = this.getTime() - h;
				if (f > e) {
					this.end(!0, "moveAs");
					return;
				}
				const v = f / e,
					[g, w] = t(r(v));
				i === "absolute" ?
					((this.ox = g), (this.oy = w)) :
					((this.ox = l + g), (this.oy = u + w));
			};
			return (
				this.ticker.add(m, !0),
				(this.animateFn.system.moveAs = m),
				(this.targetValue.system.moveAs = [c, a]),
				this
			);
		}
		register(t, e) {
			if (typeof this.value[t] == "number")
				return this.error(
					`Property ${t} has been regietered twice.`,
					"reregister"
				);
			(this.value[t] = e), (this.applying[t] = !1);
		}
		apply(t, e, i = !1) {
			this.applying[t] === !0 && this.end(!1, t),
				t in this.value ||
				this.error(`You are trying to execute nonexistent property ${t}.`),
				(this.applying[t] = !0);
			const r = this.value[t],
				h = this.getTime(),
				{ timing: l, relation: u, easeTime: c } = this,
				a = u === "absolute" ? e - r : e;
			if ((this.hook("start"), c <= 0)) return this.end(!1, t), this;
			const m = () => {
				const f = this.getTime() - h;
				if (f > c) {
					this.end(!1, t);
					return;
				}
				const v = f / c,
					g = l(v);
				this.value[t] = r + g * a;
			};
			return (
				this.ticker.add(m, i),
				(this.animateFn.custom[t] = m),
				(this.targetValue.custom[t] = a + r),
				this
			);
		}
		applyMulti(t = !1) {
			this.applying["@@bind"] === !0 && this.end(!1, "@@bind"),
				(this.applying["@@bind"] = !0);
			const e = this.bindInfo,
				i = e.map((m) => this.value[m]),
				r = this.getTime(),
				{ multiTiming: h, relation: l, easeTime: u } = this,
				c = h(1);
			if (c.length !== i.length)
				throw new TypeError(
					`The number of binded animate attributes and timing function returns's length does not match. binded: ${e.length}, timing: ${c.length}`
				);
			if ((this.hook("start"), u <= 0)) return this.end(!1, "@@bind"), this;
			const a = () => {
				const d = this.getTime() - r;
				if (d > u) {
					this.end(!1, "@@bind");
					return;
				}
				const f = d / u,
					v = h(f);
				e.forEach((g, w) => {
					l === "absolute" ?
						(this.value[g] = v[w]) :
						(this.value[g] = i[w] + v[w]);
				});
			};
			return (
				this.ticker.add(a, t),
				(this.animateFn.custom["@@bind"] = a),
				(this.targetValue.system["@@bind"] = c),
				this
			);
		}
		applySys(t, e, i) {
			i !== "move" && this.applying[i] === !0 && this.end(!0, i),
				(this.applying[i] = !0);
			const r = this[t],
				h = this.getTime(),
				l = this.timing,
				u = this.relation,
				c = this.easeTime,
				a = u === "absolute" ? e - r : e;
			if ((this.hook("start", `${i}start`), c <= 0)) return this.end(!1, i);
			const m = () => {
				const f = this.getTime() - h;
				if (f > c) {
					this.end(!0, i);
					return;
				}
				const v = f / c,
					g = l(v);
				(this[t] = r + a * g), t !== "oy" && this.hook(i);
			};
			this.ticker.add(m, !0),
				t === "ox" ?
				(this.animateFn.system.move[0] = m) :
				t === "oy" ?
				(this.animateFn.system.move[1] = m) :
				(this.animateFn.system[i] = m),
				i === "move" ?
				(t === "ox" && (this.targetValue.system.move[0] = a + r),
					t === "oy" && (this.targetValue.system.move[1] = a + r)) :
				i !== "shake" && (this.targetValue.system[i] = a + r);
		}
		error(t, e) {
			throw e === "repeat" ?
				new Error(`Cannot execute the same animation twice. Info: ${t}`) :
				e === "reregister" ?
				new Error(`Cannot register an animated property twice. Info: ${t}`) :
				new Error(t);
		}
		end(t, e) {
			if (t === !0)
				if (
					((this.applying[e] = !1),
						e === "move" ?
						(this.ticker.remove(this.animateFn.system.move[0]),
							this.ticker.remove(this.animateFn.system.move[1])) :
						e === "moveAs" ?
						this.ticker.remove(this.animateFn.system.moveAs) :
						e === "@@bind" ?
						this.ticker.remove(this.animateFn.system["@@bind"]) :
						this.ticker.remove(this.animateFn.system[e]),
						e === "move")
				) {
					const [i, r] = this.targetValue.system.move;
					(this.ox = i), (this.oy = r), this.hook("moveend", "end");
				} else if (e === "moveAs") {
				const [i, r] = this.targetValue.system.moveAs;
				(this.ox = i), (this.oy = r), this.hook("moveend", "end");
			} else
				e === "rotate" ?
				((this.angle = this.targetValue.system.rotate),
					this.hook("rotateend", "end")) :
				e === "resize" ?
				((this.size = this.targetValue.system.resize),
					this.hook("resizeend", "end")) :
				e === "@@bind" ?
				this.bindInfo.forEach((r, h) => {
					this.value[r] = this.targetValue.system["@@bind"][h];
				}) :
				((this.sx = 0), (this.sy = 0), this.hook("shakeend", "end"));
			else
				(this.applying[e] = !1),
				this.ticker.remove(this.animateFn.custom[e]),
				(this.value[e] = this.targetValue.custom[e]),
				this.hook("end");
		}
	}
	class j extends F {
		constructor() {
			super();
			o(this, "now", {});
			o(this, "target", {});
			o(this, "transitionFn", {});
			o(this, "value");
			o(this, "handleSet", (t, e, i) => (this.transition(e, i), !0));
			o(this, "handleGet", (t, e) => this.now[e]);
			(this.timing = (t) => t),
			(this.value = new Proxy(this.target, {
				set: this.handleSet,
				get: this.handleGet,
			}));
		}
		mode(t) {
			return (this.timing = t), this;
		}
		time(t) {
			return (this.easeTime = t), this;
		}
		relative() {
			return (this.relation = "relative"), this;
		}
		absolute() {
			return (this.relation = "absolute"), this;
		}
		transition(t, e) {
			if (e === this.target[t]) return this;
			if (!T(this.now[t])) return (this.now[t] = e), this;
			this.applying[t] && this.end(t, !0),
				(this.applying[t] = !0),
				this.hook("start");
			const i = this.getTime(),
				r = this.easeTime,
				h = this.timing,
				l = this.now[t],
				u = e + (this.relation === "absolute" ? 0 : l),
				c = u - l;
			this.target[t] = u;
			const a = () => {
				const d = this.getTime() - i;
				if (d >= r) {
					this.end(t);
					return;
				}
				const f = d / r;
				(this.now[t] = h(f) * c + l), this.hook("running");
			};
			return (
				(this.transitionFn[t] = a),
				r <= 0 ? (this.end(t), this) : (this.ticker.add(a), this)
			);
		}
		end(t, e = !1) {
			const i = this.transitionFn[t];
			if (!T(i))
				throw new ReferenceError(
					`You are trying to end an ended transition: ${t}`
				);
			this.ticker.remove(this.transitionFn[t]),
				delete this.transitionFn[t],
				(this.applying[t] = !1),
				this.hook("end"),
				e || (this.now[t] = this.target[t]);
		}
	}
	const x = (...n) => n.reduce((s, t) => s + t, 0),
		y = (n) => {
			if (n === 0) return 1;
			let s = n;
			for (; n > 1;) n--, (s *= n);
			return s;
		},
		A = (n, s) => Math.round(y(s) / (y(n) * y(s - n))),
		p = (n, s, t = (e) => 1 - s(1 - e)) =>
		n === "in" ?
		s :
		n === "out" ?
		t :
		n === "in-out" ?
		(e) => (e < 0.5 ? s(e * 2) / 2 : 0.5 + t((e - 0.5) * 2) / 2) :
		(e) => (e < 0.5 ? t(e * 2) / 2 : 0.5 + s((e - 0.5) * 2) / 2),
		$ = Math.cosh(2),
		z = Math.acosh(2),
		V = Math.tanh(3),
		P = Math.atan(5);

	function O() {
		return (n) => n;
	}

	function q(...n) {
		const s = [0].concat(n);
		s.push(1);
		const t = s.length,
			e = Array(t)
			.fill(0)
			.map((i, r) => A(r, t - 1));
		return (i) => {
			const r = e.map((h, l) => h * s[l] * (1 - i) ** (t - l - 1) * i ** l);
			return x(...r);
		};
	}

	function U(n, s) {
		if (n === "sin") {
			const t = (i) => Math.sin((i * Math.PI) / 2);
			return p(s, (i) => 1 - t(1 - i), t);
		}
		if (n === "sec") {
			const t = (i) => 1 / Math.cos(i);
			return p(s, (i) => t((i * Math.PI) / 3) - 1);
		}
		throw new TypeError(
			"Unexpected parameters are delivered in trigo timing function."
		);
	}

	function C(n, s) {
		if (!Number.isInteger(n))
			throw new TypeError(
				"The first parameter of power timing function only allow integer."
			);
		return p(s, (e) => e ** n);
	}

	function G(n, s) {
		if (n === "sin") return p(s, (e) => (Math.cosh(e * 2) - 1) / ($ - 1));
		if (n === "tan") {
			const t = (i) => (Math.tanh(i * 3) * 1) / V;
			return p(s, (i) => 1 - t(1 - i), t);
		}
		if (n === "sec") {
			const t = (i) => 1 / Math.cosh(i);
			return p(s, (i) => 1 - (t(i * z) - 0.5) * 2);
		}
		throw new TypeError(
			"Unexpected parameters are delivered in hyper timing function."
		);
	}

	function N(n, s) {
		if (n === "sin") {
			const t = (i) => (Math.asin(i) / Math.PI) * 2;
			return p(s, (i) => 1 - t(1 - i), t);
		}
		if (n === "tan") {
			const t = (i) => Math.atan(i * 5) / P;
			return p(s, (i) => 1 - t(1 - i), t);
		}
		throw new TypeError(
			"Unexpected parameters are delivered in inverse trigo timing function."
		);
	}

	function B(n, s = () => 1) {
		let t = -1;
		return (e) => (
			(t *= -1), e < 0.5 ? n * s(e * 2) * t : n * s((1 - e) * 2) * t
		);
	}

	function D(n, s = 1, t = [0, 0], e = 0, i = (h) => 1, r = !1) {
		return (h) => {
			const l = s * h * Math.PI * 2 + (e * Math.PI) / 180,
				u = Math.cos(l),
				c = Math.sin(l),
				a = n * i(i(r ? 1 - h : h));
			return [a * u + t[0], a * c + t[1]];
		};
	}

	function H(n, s, ...t) {
		const e = [n].concat(t);
		e.push(s);
		const i = e.length,
			r = Array(i)
			.fill(0)
			.map((h, l) => A(l, i - 1));
		return (h) => {
			const l = r.map(
					(c, a) => c * e[a][0] * (1 - h) ** (i - a - 1) * h ** a
				),
				u = r.map((c, a) => c * e[a][1] * (1 - h) ** (i - a - 1) * h ** a);
			return [x(...l), x(...u)];
		};
	}

	if ("animate" in core.plugin)
		throw new ReferenceError(`插件中已存在名为animate的属性！`);

	core.plugin.animate = {
		Animation: Y,
		AnimationBase: F,
		Ticker: I,
		Transition: j,
		sleep: R,
		circle: D,
		bezierPath: H,
		linear: O,
		bezier: q,
		trigo: U,
		power: C,
		hyper: G,
		inverseTrigo: N,
		shake: B,
	};
},
    "自动操作": function () {
	// 合并版自动清怪插件 (修改版：支持过滤血瓶)

	const ctxName = 'autoClear';

	// 定义血瓶ID列表
	const potionIds = ['redPotion', 'bluePotion', 'greenPotion', 'yellowPotion', 'superPotion'];

	// ----------------- 辅助函数 / 工具 -----------------
	function has(v) {
		return v !== null && v !== undefined;
	}

	function willLvUp(exp) {
		const nextExp = core.getNextLvUpNeed();
		if (typeof exp === 'number' && typeof nextExp === 'number' && exp >= nextExp) return true;
		return false;
	}

	// ----------------- canBattle -----------------
	function canBattle(enemy, x, y) {
		const loc = `${x},${y}`;
		const floor = core.floors[core.status.floorId];
		const e = core.getEnemyValue(enemy, null, x, y);
		const hasEvent =
			has(floor.afterBattle[loc]) || has(floor.beforeBattle[loc]) ||
			has(e.beforeBattle) || has(e.afterBattle) ||
			has(floor.events[loc]) || willLvUp(e.exp); // 防止有升级后事件
		const cache = core.status.checkBlock.cache;
		const hasGuards = has(cache) && has(cache[loc]) && cache[loc]?.guards?.length > 0; // 会被支援

		// 有事件，不清
		if (hasEvent) return false;
		// 有特定特殊属性的怪不清
		if (
			core.hasSpecial(e.special, 12) || // 中毒
			core.hasSpecial(e.special, 13) || // 衰弱
			core.hasSpecial(e.special, 14) || // 诅咒
			core.hasSpecial(e.special, 19) || // 自爆 
			core.hasSpecial(e.special, 21) || // 退化
			core.hasSpecial(e.special, 26) || // 支援
			hasGuards || // 会被支援
			core.hasSpecial(e.special, 27) || // 捕捉
			core.hasSpecial(e.special, 28) || // 追猎
			core.hasSpecial(e.special, 29) // 败移:特殊战后事件
		) {
			return false;
		}
		const damage = core.getDamageInfo(enemy, void 0, x, y)?.damage;
		// 0伤或负伤，清
		if (has(damage) && damage <= 0) return true;
		return false;
	}

	// ----------------- canGetItem -----------------
	function canGetItem(item, loc, floorId) {
		return !hasBlockDamage(loc) || core.flags.enableGentleClick;
	}

	// ----------------- 拾取动画 -----------------
	class AttractAnimate {
		constructor() {
			this.name = 'attractAnimate';
			this.isPlaying = false;
			this.nodes = [];
			this.lastTime = -1;
			this.thr = 5; // 缓动比例倒数，越大移动越慢
		}

		add(id, x, y, callback) {
			if (core.isReplaying()) return;
			this.nodes.push({ id, x, y, callback });
		}

		start() {
			if (this.isPlaying) return;
			if (core.isReplaying()) return;
			if (core.getLocalStorage && core.getLocalStorage('skipPerform')) return;
			this.isPlaying = true;
			core.registerAnimationFrame(this.name, true, this.update.bind(this));
			this.ctx = core.createCanvas(this.name, 0, 0, core.__PIXELS__, core.__PIXELS__, 120);
		}

		remove() {
			core.unregisterAnimationFrame(this.name);
			core.deleteCanvas(this.name);
			this.isPlaying = false;
		}

		clear() {
			this.nodes = [];
			this.remove();
		}

		update(timeStamp) {
			if (this.lastTime < 0) this.lastTime = timeStamp;
			if (timeStamp - this.lastTime < 20) return;
			this.lastTime = timeStamp;

			core.clearMap(this.name);

			const heroCenterX = core.status.heroCenter.px - 16;
			const heroCenterY = core.status.heroCenter.py - 16;

			for (const n of this.nodes) {
				const dx = heroCenterX - n.x;
				const dy = heroCenterY - n.y;

				if (Math.abs(dx) <= this.thr && Math.abs(dy) <= this.thr) {
					n.dead = true;
				} else {
					n.x += ~~(dx / this.thr);
					n.y += ~~(dy / this.thr);
				}

				core.drawIcon(this.name, n.id, n.x, n.y, 32, 32);
			}

			const remaining = [];
			for (const n of this.nodes) {
				if (n.dead && n.callback) n.callback();
				if (!n.dead) remaining.push(n);
			}
			this.nodes = remaining;

			if (this.nodes.length === 0) this.remove();
		}
	}

	const animateHwnd = new AttractAnimate();

	this.pickOneItemAnimate = function (id, x, y, callback) {
		if (core.isReplaying()) return;
		animateHwnd.add(id, x, y, callback);
		animateHwnd.start();
	};
	this.clearAttractAnimate = function () {
		animateHwnd.clear();
	};

	// ----------------- 判断地图伤害 -----------------
	function hasBlockDamage(loc) {
		const checkblockInfo = core.status.checkBlock;
		const damage = checkblockInfo?.damage?.[loc];
		const ambush = checkblockInfo?.ambush?.[loc];
		const repulse = checkblockInfo?.repulse?.[loc];
		const chase = checkblockInfo?.chase?.[loc];

		return (has(damage) && damage > 0) || has(ambush) || has(repulse) || has(chase);
	}

	// ----------------- judge -----------------
	function judge(block, nx, ny, tx, ty, dir, floorId, autoFlags) {
		if (core.getFgNumber(tx, ty) === 103) return { type: "unknown", canGoThrough: false };
		if (!has(block) || block.disable) {
			return { type: "none", canGoThrough: true };
		}
		const cls = block.event.cls;
		const loc = `${tx},${ty}`;
		const floor = core.floors[floorId];
		const changeFloor = floor.changeFloor[loc];

		if (has(changeFloor)) {
			if ((changeFloor.ignoreChangeFloor ?? core.flags.ignoreChangeFloor) && block.id === 0) {
				return { type: "unknown", canGoThrough: true };
			}
			return { type: "unknown", canGoThrough: false };
		}

		if (has(block.event.data)) return { type: "unknown", canGoThrough: false };

		const isEnemy = autoFlags.battle && cls && cls.startsWith && cls.startsWith('enemy'),
			isItem = autoFlags.item && cls === 'items';

		const isWall = autoFlags.wall && (block.id === 2);
		const isLava = autoFlags.wall && (block.id === 5 && core.hasItem && core.hasItem('snow') && core.material.items["snow"] && core.material.items["snow"].cls === 'constants');

		if (isEnemy) return { type: "enemy", canGoThrough: true };
		if (isItem) return { type: "item", canGoThrough: true };
		if (isWall) return { type: "wall", canGoThrough: true };
		if (isLava) return { type: "lava", canGoThrough: true };

		return { type: "unknown", canGoThrough: false };
	}

	const { Transition, hyper, Ticker } = core.plugin.animate ?? {};
	const transitionTime = 200;
	const transitionList = [];

	// ------ 修改：增加 autoFlags 参数以判断是否过滤血瓶 ------
	function _performGetItem(item, x, y, loc, floorId, autoFlags) {
		if (!canGetItem(item, loc, floorId)) {
			return false;
		}

		// 判断：如果模式是 nopotion 且物品在血瓶列表中，则不拾取
		if (autoFlags.item === 'nopotion' && potionIds.includes(item.id)) {
			return false;
		}

		core.getItem(item.id, 1, x, y);

		if (!main.replayChecking && Ticker) {
			let px = x * 32 - core.bigmap.offsetX;
			let py = y * 32 - core.bigmap.offsetY;
			const t = new Transition();
			t.mode(hyper('sin', 'out'))
				.time(transitionTime)
				.absolute()
				.transition('x', px)
				.transition('y', py);
			let { x: hx, y: hy } = core.status.hero.loc;
			t.value.x = hx * 32 - core.bigmap.offsetX;
			t.value.y = hy * 32 - core.bigmap.offsetY;
			transitionList.push(t);
			t.ticker.add(() => {
				core.drawIcon('_autoItem_', item.id, t.value.x, t.value.y, 32, 32);
				let { x: hx, y: hy } = core.status.hero.loc;
				const heroPx = hx * 32 - core.bigmap.offsetX;
				const heroPy = hy * 32 - core.bigmap.offsetY;
				if (Math.abs(t.value.x - heroPx) < 0.05 && Math.abs(t.value.y - heroPy) < 0.05) {
					t.ticker.destroy();
					const index = transitionList.findIndex(v => v === t);
					if (index !== -1) transitionList.splice(index, 1);
				}
			});
		}

		return true;
	}

	if (!main.replayChecking) {
		const ticker = new Ticker();
		ticker.add(() => {
			if (!core.isPlaying()) return;
			const ctx = core.getContextByName('_autoItem_');
			if (!has(ctx)) return;
			core.clearMap(ctx);
		});
	}

	// ----------------- BFS -----------------
	function bfs(floorId, deep = Infinity, autoFlags) {
		core.extractBlocks(floorId);
		const objs = core.getMapBlocksObj(floorId);
		const bgMap = core.getBgMapArray(floorId);
		const { x, y } = core.status.hero.loc;
		const dir = Object.entries(core.utils.scan).map(v => [v[0], v[1].x, v[1].y]);
		const floor = core.status.maps[floorId];

		const queue = [
			[x, y]
		];
		const mapped = {
			[`${x},${y}`]: true
		};

		if (!autoFlags) autoFlags = { battle: true, item: true, wall: false };

		while (queue.length > 0 && deep > 0) {
			const [nx, ny] = queue.shift();
			dir.forEach(v => {
				const [tx, ty] = [nx + v[1], ny + v[2]];
				if (tx < 0 || ty < 0 || tx >= floor.width || ty >= floor.height) {
					return;
				}
				const loc = `${tx},${ty}`;
				if (mapped[loc]) return;
				const block = objs[loc];
				mapped[loc] = true;
				if (core.onSki && core.onSki(bgMap[ty][tx])) return;
				const { type, canGoThrough } = judge(block, nx, ny, tx, ty, v[0], floorId, autoFlags);
				if (!canGoThrough) return;

				if (type === 'enemy') {
					if (canBattle(block.event.id, tx, ty) && !block.disable) {
						core.battle(block.event.id, tx, ty);
						core.updateCheckBlock(floorId);
					} else {
						return;
					}
				} else if (type === 'item') {
					const item = core.material.items[block.event.id];
					// 修改：传入 autoFlags
					if (_performGetItem(item, tx, ty, loc, floorId, autoFlags)) {
						core.updateCheckBlock(floorId);
					} else {
						return;
					}
				} else if (type === 'wall' || type === 'lava') {
					if (block && !block.disable && !block.event.data) {
						if (type === 'wall') {
							core.removeBlock(tx, ty);
							core.updateCheckBlock(floorId);
						} else if (type === 'lava') {
							core.removeBlock(tx, ty);
							core.updateCheckBlock(floorId);
						}
					} else {
						return;
					}
				}

				if (hasBlockDamage(loc)) return;
				queue.push([tx, ty]);
			});
			deep--;
		}
	}

	this.auto = function () {
		if (!core.status.floorId || !core.status.checkBlock || !core.status.checkBlock.damage) return;
		if (core.status.event.id == 'action' || core.events.onSki && core.events.onSki() || core.status.lockControl || !core.maps._canMoveDirectly_checkGlobal()) return;

		let autoFlags = { battle: false, item: false, wall: false };
		try {
			const heroFlags = core.status.hero && core.status.hero.flags && core.status.hero.flags.__auto__;
			autoFlags.battle = !!heroFlags.battle;
			// 修改：不要强制转换 boolean，允许 item 为字符串状态
			autoFlags.item = heroFlags.item;
			autoFlags.wall = !!heroFlags.wall;
		} catch (e) {}
		if (!autoFlags.battle && !autoFlags.item && !autoFlags.wall) return;

		const { x, y } = core.status.hero.loc;
		const floor = core.floors[core.status.floorId];
		const loc = `${x},${y}`;
		const hasEvent = has(floor.events[loc]);
		if (hasEvent) return;
		const block = core.getBlock(x, y);
		if (block != null && block.event.cls !== 'items') return;

		const before = core.flags.__forbidSave__;
		core.flags.__forbidSave__ = true;
		core.flags.__statistics__ = true;

		let deep = Infinity;

		core.updateCheckBlock(core.status.floorId);

		if (hasBlockDamage(loc)) {
			deep = core.flags.enableGentleClick ? 1 : 0;
		}

		if (!core.getContextByName('_autoItem_')) {
			core.createCanvas(
				'_autoItem_',
				0,
				0,
				core._PX_ ?? core.__PIXELS__,
				core._PY_ ?? core.__PIXELS__,
				75
			);
		}

		bfs(core.status.floorId, deep, autoFlags);

		if (!core.isReplaying()) animateHwnd.start();

		core.flags.__statistics__ = false;
		core.flags.__forbidSave__ = before;
		core.updateStatusBar();
	}

	core.registerReplayAction("moveDirectly", function (action) {
		if (action.indexOf("move:") != 0) return false;

		var pos = action.substring(5).split(":");
		var x = parseInt(pos[0]),
			y = parseInt(pos[1]);
		var nowx = core.getHeroLoc('x'),
			nowy = core.getHeroLoc('y');
		var ignoreSteps = core.canMoveDirectly(x, y);
		if (!core.moveDirectly(x, y, ignoreSteps)) return false;
		if (core.status.replay.speed == 24) {
			core.replay();
			return true;
		}

		core.ui.drawArrow('ui', 32 * nowx + 16 - core.bigmap.offsetX, 32 * nowy + 16 - core.bigmap.offsetY,
			32 * x + 16 - core.bigmap.offsetX, 32 * y + 16 - core.bigmap.offsetY, '#FF0000', 3);
		var timeout = this.__replay_getTimeout();
		if (ignoreSteps < 10) timeout = timeout * ignoreSteps / 10;
		setTimeout(function () {
			core.clearMap('ui');
			core.replay();
		}, timeout);
		return true;
	});

	function update() {
		core.control.updateCheckBlock();
		core.control.updateDamage();
		core.auto();
		if (main.replayChecking) return;
	}
	core.moveOneStep = function (fromX, fromY, callback) {
		return core.control.moveOneStep(fromX, fromY, callback);
	}
	control.prototype.moveOneStep = function (fromX, fromY, callback) {
		const res = this.controldata.moveOneStep(fromX, fromY, callback);
		if (core.status.event.data)
			core.insertAction({ "type": "function", "function": "function(){ core.auto(); if (main.replayChecking) return; }" }, null, null, null, true);
		else
			update();
		return res;
	};

	control.prototype.moveDirectly = function (destX, destY, ignoreSteps) {
		const res = this.controldata.moveDirectly(
			destX,
			destY,
			ignoreSteps
		);
		update();
		return res;
	};
	control.prototype.setHeroLoc = function (name, value, noGather) {
		if (!core.status.hero) return;
		if (typeof name === 'object' && name !== null) {
			const locObject = name;
			const shouldGather = !value;
			Object.assign(core.status.hero.loc, locObject);
			if (('x' in locObject || 'y' in locObject) && shouldGather) {
				this.gatherFollowers();
			}
		} else {
			core.status.hero.loc[name] = value;
			if ((name == 'x' || name == 'y') && !noGather) {
				this.gatherFollowers();
			}
		}
		for (let i = 0; i < transitionList.length; i++) {
			const t = transitionList[i];
			let { x, y } = core.status.hero.loc;
			t.value.x = x * 32 - core.bigmap.offsetX;
			t.value.y = y * 32 - core.bigmap.offsetY;
		}
	}

	enemys.prototype.getEnemyValue = function (enemy, name, x, y, floorId) {
		floorId = floorId || core.status.floorId;

		const pointInfo = (((flags.enemyOnPoint || {})[floorId] || {})[x + "," + y] || {});

		if (core.isset(name) && pointInfo[name] != null) {
			return pointInfo[name];
		}

		if (enemy == null) {
			var block = core.getBlock(x, y, floorId);
			if (block == null) return null;
			enemy = core.material.enemys[block.event.id];
		} else if (typeof enemy == 'string') {
			enemy = core.material.enemys[enemy];
			if (enemy == null) return null;
		}
		enemy = core.clone(enemy);

		if (!core.isset(name)) {
			for (let status in pointInfo) {
				if (pointInfo.hasOwnProperty(status)) enemy[status] = pointInfo[status];
			}
			return enemy;
		} else return enemy[name];
	}
	core.control.registerReplayAction("help", function (action) {
		if (!action || action.indexOf("help") !== 0) return false;
		core.insertAction([{ type: "insert", name: "游戏帮助" }]);
		return true;
	});
},
    "额外功能": function () {
	ui.prototype.drawScrollText = function (content, time, lineHeight, callback) {
		content = core.replaceText(content || "");
		lineHeight = lineHeight || 1.4;
		time = time || 5000;
		this.clearUI();
		var offset = core.status.textAttribute.offset || 15;
		lineHeight *= core.status.textAttribute.textfont;
		var ctx = this._createTextCanvas(content, lineHeight);
		var obj = { align: core.status.textAttribute.align, lineHeight: lineHeight };
		if (obj.align == 'right') obj.left = core.__PIXELS__ - offset;
		else if (obj.align != 'center') obj.left = offset;
		this.drawTextContent(ctx, content, obj);
		this._drawScrollText_animate(ctx, time, callback);
	}

	ui.prototype._createTextCanvas = function (content, lineHeight) {
		var width = core.__PIXELS__;
		var height = 30 + this.getTextContentHeight(content, {
			lineHeight: lineHeight
		});

		// 创建离屏 canvas（不加入 DOM）
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		// 关键：完全复用引擎的 HD 规则
		core.maps._setHDCanvasSize(ctx, width, height);

		return ctx;
	};

	// 假设 'ui.prototype' 已经定义
	ui.prototype._drawScrollText_animate = function (ctx, time, callback) {
		// ctx.canvas 是 TextCanvas，它已经被高清缩放
		var physicalHeight = ctx.canvas.height;
		var physicalWidth = ctx.canvas.width;

		// 1. 获取用于缩放的 ratio
		// 假设 core.domStyle.ratio 和 devicePixelRatio 是全局可访问的，
		// 并且它们是 _setHDCanvasSize 中使用的相同的值。
		var ratio = (core.domStyle.ratio || 1) * (devicePixelRatio || 1);

		// 2. 计算 TextCanvas 的“逻辑”尺寸
		// 这是它在屏幕上应该占据的尺寸
		var logicalHeight = physicalHeight / ratio;
		var logicalWidth = physicalWidth / ratio;

		// 3. 获取目标画布 (ui) 的上下文
		// 你的 core.drawImage('ui', ...) 内部可能就是这么做的
		var ui_ctx = core.getContextByName('ui');
		if (!ui_ctx) {
			console.error("无法获取 'ui' 画布的上下文！");
			if (callback) callback();
			return;
		}

		time /= Math.max(core.status.replay.speed, 1);
		var per_pixel = 1; // 每次滚动 1 "逻辑"像素

		// 4. 使用“逻辑”高度来计算总时间
		var per_time = time * per_pixel / (core.__PIXELS__ + logicalHeight);
		var currH = core.__PIXELS__; // 初始“逻辑”Y坐标

		// 5. 初始绘制
		// 使用 5 参数的 drawImage
		core.clearMap('ui'); // 先清除
		ui_ctx.drawImage(ctx.canvas, 0, currH, logicalWidth, logicalHeight);

		var animate = setInterval(function () {
			core.clearMap('ui');
			currH -= per_pixel;

			// 6. 使用“逻辑”高度进行结束比较
			if (currH < -logicalHeight) {
				delete core.animateFrame.asyncId[animate];
				clearInterval(animate);
				if (callback) callback();
				return;
			}

			// 7. 在循环中同样使用 5 参数的 drawImage
			// (ctx.canvas是源图像, 0, currH是目标逻辑坐标, logicalWidth, logicalHeight是目标逻辑尺寸)
			ui_ctx.drawImage(ctx.canvas, 0, currH, logicalWidth, logicalHeight);

		}, per_time);

		core.animateFrame.lastAsyncId = animate;
		core.animateFrame.asyncId[animate] = callback;
	}
	//关闭预览模式
	core.registerAction('ondown', '_sys_ondown', function (x, y, px, py) {
		if (core.status.lockControl) return false;
		core.status.downTime = new Date();
		core.clearMap('route', 0, 0, 352, 352);
		var pos = { 'x': parseInt((px + core.bigmap.offsetX) / 32), 'y': parseInt((py + core.bigmap.offsetY) / 32) };
		core.status.stepPostfix = [];
		core.status.stepPostfix.push(pos);
		core.fillRect('ui', pos.x * 32 + 12 - core.bigmap.offsetX, pos.y * 32 + 12 - core.bigmap.offsetY, 8, 8, '#bfbfbf');

		clearTimeout(core.timeout.onDownTimeout);
		core.timeout.onDownTimeout = null;
		core.status.preview.prepareDragging = false;
		/*if (!core.hasFlag('__lockViewport__') && (core.status.thisMap.width > core.__SIZE__ || core.status.thisMap.height > core.__SIZE__)) {
		    core.status.preview.prepareDragging = true;
		    core.status.preview.px = px;
		    core.status.preview.py = py;
		    core.timeout.onDownTimeout = setTimeout(function () {
		        core.clearMap('ui');
		        core.status.preview.prepareDragging = false;
		        core.status.preview.enabled = true;
		        core.status.preview.dragging = true;
		        core.drawTip('已进入预览模式，可直接拖动大地图');
		        core.status.stepPostfix = [];
		    }, 500);
		} */
	}, 0);

	// 新增：移动前快照
	function _snapshotBeforeMove() {
		const loc = core.status.hero.loc;
		core.status.__moveSnapshot__ = {
			x: loc.x,
			y: loc.y,
			direction: loc.direction,
			routeLength: core.status.route.length
		};
	};
	//快照存档
	this.autosaveFromSnapshot = function () {
		const s = core.status.__moveSnapshot__;
		if (!s) return;

		var removeLast = core.status.route.length > s.routeLength;

		const data = {
			heroLoc: { x: s.x, y: s.y, direction: s.direction }
		};

		if (core.hasFlag('__forbidSave__')) return;
		var x = null;
		if (removeLast) {
			x = core.status.route.pop();
			//core.status.route.push("turn:" + core.getHeroLoc('direction'));
		}
		if (core.status.event.id == 'action') // 事件中的自动存档
			core.setFlag("__events__", core.clone(core.status.event.data));
		if (core.saves.autosave.data == null) {
			core.saves.autosave.data = [];
		}
		core.saves.autosave.data.splice(core.saves.autosave.now, 0, core.saveData(data));
		core.saves.autosave.now += 1;
		if (core.saves.autosave.data.length > core.saves.autosave.max) {
			if (core.saves.autosave.now < core.saves.autosave.max / 2)
				core.saves.autosave.data.pop();
			else {
				core.saves.autosave.data.shift();
				core.saves.autosave.now = core.saves.autosave.now - 1;
			}
		}
		core.saves.autosave.updated = true;
		core.saves.ids[0] = true;
		core.removeFlag("__events__");
		if (removeLast) {
			//core.status.route.pop();
			if (x) core.status.route.push(x);
		}

		//delete core.status.__moveSnapshot__;
	};
	core.saveData = function (data) {
		return core.control.saveData(data);
	}
	control.prototype.saveData = function (data) {
		return core.control.controldata.saveData(data);
	}
	control.prototype.moveHero = function (direction, callback) {
		// 如果正在移动，直接return
		if (core.status.heroMoving != 0) return;
		// 逻辑简化：不再在这里分流，而是统一交给 _moveHero_moving 处理
		// 这样可以确保无论是否带 callback，移动的前置处理（如快照、状态位重置）都是一致的
		core._moveHero_moving(direction, callback);
	}
	control.prototype._moveAction_popAutomaticRoute = function () {
		var automaticRoute = core.status.automaticRoute;
		// 检查自动寻路是否被弹出
		if (automaticRoute.autoHeroMove) {
			automaticRoute.movedStep++;
			automaticRoute.lastDirection = core.getHeroLoc('direction');
			if (automaticRoute.destStep == automaticRoute.movedStep) {
				if (automaticRoute.autoStep == automaticRoute.autoStepRoutes.length) {
					core.clearContinueAutomaticRoute();
					core.stopAutomaticRoute();
				} else {
					automaticRoute.movedStep = 0;
					automaticRoute.destStep = automaticRoute.autoStepRoutes[automaticRoute.autoStep].step;
					_snapshotBeforeMove();
					core.setHeroLoc('direction', automaticRoute.autoStepRoutes[automaticRoute.autoStep].direction);
					core.status.automaticRoute.autoStep++;
				}
			}
		}
	}
	core._moveHero_moving = core.control._moveHero_moving = function (direction, callback) {
		core.status.heroStop = false;
		core.status.automaticRoute.moveDirectly = false;

		// 【关键修改 1】快照必须在改变方向之前！
		// 这样 Undo 才能回到移动前原本的朝向，而不是移动前但已经转身的状态
		_snapshotBeforeMove();

		// 改变勇士朝向
		if (core.isset(direction))
			core.setHeroLoc('direction', direction);

		var move = () => {
			if (core.status.heroStop) {
				// 如果有回调且意外停止（通常由事件触发停止），视逻辑决定是否执行回调
				// 这里通常不需要处理 callback，因为 callback 一般绑定在 moveAction 完成后
				return;
			}

			// —— Debug+Ctrl：穿墙单步 —— 
			if (core.hasFlag('debug') && core.status.ctrlDown && core.status.heroMoving === 0) {
				var nx = core.nextX(),
					ny = core.nextY();
				if (nx < 1 || nx >= core.bigmap.width - 1 ||
					ny < 1 || ny >= core.bigmap.height - 1) {
					return;
				}
				core.events.eventMoveHero(
					[core.getHeroLoc('direction') + ':1'],
					core.values.moveSpeed,
					move
				);
			}
			// —— 自动寻路逻辑 —— 
			else if (core.status.automaticRoute.autoStepRoutes.length > 0) {
				// 【关键修改 2】这里移除了原有的 _snapshotBeforeMove()
				// 因为第一步已经在函数最顶层快照过了。

				core.moveAction(); // 执行这一步移动

				setTimeout(() => {
					// 检查是否还有下一步
					if (core.status.automaticRoute.autoStepRoutes.length > 0) {
						// 【关键修改 3】只有在确实要走 Step 2, 3... 时，才在递归前快照
						_snapshotBeforeMove();
					}
					move(); // 递归调用
				}, 50);
			}
			// —— 手动按键控制 / 单步带回调 —— 
			else {
				// 将 callback 透传给 moveAction
				// 这样原本 moveHero 中的 if(callback) return this.moveAction... 逻辑就完美融合进来了
				core.moveAction(callback);

				// 手动移动只走一步，立刻标记停止
				core.status.heroStop = true;
			}
		};

		move();
	};
	control.prototype.setHeroMoveInterval = function (callback) {
		if (core.status.heroMoving > 0) return;
		if (core.status.replay.speed == 24) {
			core.status.heroStop = true;
			if (callback) callback();
			return;
		}

		core.status.heroMoving = 1;

		var toAdd = 1;
		if (core.status.replay.speed > 3) toAdd = 2;
		if (core.status.replay.speed > 6) toAdd = 4;
		if (core.status.replay.speed > 12) toAdd = 8;

		core.interval.heroMoveInterval = window.setInterval(function () {
			core.status.heroMoving += toAdd;
			if (core.status.heroMoving >= 8) {
				clearInterval(core.interval.heroMoveInterval);
				core.status.heroMoving = 0;
				//core.status.heroStop = true;
				if (callback) callback();
			}
		}, core.values.moveSpeed / 8 * toAdd / core.status.replay.speed);
	}
	this.showTradeSummary = function () {
		// 金币商店统计
		let shop1_hp_times = core.getFlag("shop1_hp_buy", 0);
		let shop1_atk_times = core.getFlag("shop1_atk_buy", 0);
		let shop1_def_times = core.getFlag("shop1_def_buy", 0);
		let shop1_hp_total = shop1_hp_times * 800;
		let shop1_atk_total = shop1_atk_times * 4;
		let shop1_def_total = shop1_def_times * 4;

		let shop2_hp_times = core.getFlag("shop2_hp_buy", 0);
		let shop2_atk_times = core.getFlag("shop2_atk_buy", 0);
		let shop2_def_times = core.getFlag("shop2_def_buy", 0);
		let shop2_hp_total = shop2_hp_times * 4000;
		let shop2_atk_total = shop2_atk_times * 20;
		let shop2_def_total = shop2_def_times * 20;

		// 经验商店统计
		let exp1_level_times = core.getFlag("exp1_level_buy", 0);
		let exp1_atk_times = core.getFlag("exp1_atk_buy", 0);
		let exp1_def_times = core.getFlag("exp1_def_buy", 0);
		let exp1_level_hp_total = exp1_level_times * 1000;
		let exp1_level_atk_total = exp1_level_times * 7;
		let exp1_level_def_total = exp1_level_times * 7;
		let exp1_atk_total = exp1_atk_times * 5;
		let exp1_def_total = exp1_def_times * 5;

		let exp2_level_times = core.getFlag("exp2_level_buy", 0);
		let exp2_atk_times = core.getFlag("exp2_atk_buy", 0);
		let exp2_def_times = core.getFlag("exp2_def_buy", 0);
		let exp2_level_hp_total = exp2_level_times * 3000;
		let exp2_level_atk_total = exp2_level_times * 20;
		let exp2_level_def_total = exp2_level_times * 20;
		let exp2_atk_total = exp2_atk_times * 17;
		let exp2_def_total = exp2_def_times * 17;

		// 钥匙商店统计
		let key_buy_yellow = core.getFlag("keyshop1_yellow_buy", 0);
		let key_buy_blue = core.getFlag("keyshop1_blue_buy", 0);
		let key_buy_red = core.getFlag("keyshop1_red_buy", 0);
		let key_buy_gold = key_buy_yellow * 10 + key_buy_blue * 50 + key_buy_red * 100;

		let key_sell_yellow = core.getFlag("keyshop2_yellow_sell", 0);
		let key_sell_blue = core.getFlag("keyshop2_blue_sell", 0);
		let key_sell_red = core.getFlag("keyshop2_red_sell", 0);
		let key_sell_gold = key_sell_yellow * 7 + key_sell_blue * 35 + key_sell_red * 70;

		let lines = [];

		// 三楼商店
		let shop1_times = shop1_hp_times + shop1_atk_times + shop1_def_times;
		if (shop1_times > 0) {
			let shop1Gains = [];
			if (shop1_hp_total > 0) shop1Gains.push(`生命+${shop1_hp_total}`);
			if (shop1_atk_total > 0) shop1Gains.push(`攻击+${shop1_atk_total}`);
			if (shop1_def_total > 0) shop1Gains.push(`防御+${shop1_def_total}`);
			lines.push(`【三楼商店】购买${shop1_times}次，总计：${shop1Gains.join('，')}`);
		}

		// 11楼商店
		let shop2_times = shop2_hp_times + shop2_atk_times + shop2_def_times;
		if (shop2_times > 0) {
			let shop2Gains = [];
			if (shop2_hp_total > 0) shop2Gains.push(`生命+${shop2_hp_total}`);
			if (shop2_atk_total > 0) shop2Gains.push(`攻击+${shop2_atk_total}`);
			if (shop2_def_total > 0) shop2Gains.push(`防御+${shop2_def_total}`);
			lines.push(`【11楼商店】购买${shop2_times}次，总计：${shop2Gains.join('，')}`);
		}

		// 五楼老人
		let exp1_times = exp1_level_times + exp1_atk_times + exp1_def_times;
		if (exp1_times > 0) {
			let exp1Details = [];
			let exp1TotalGains = [];

			if (exp1_level_times > 0) {
				exp1Details.push(`升级${exp1_level_times}次`);
				let levelGains = [];
				if (exp1_level_hp_total > 0) levelGains.push(`生命+${exp1_level_hp_total}`);
				if (exp1_level_atk_total > 0) levelGains.push(`攻击+${exp1_level_atk_total}`);
				if (exp1_level_def_total > 0) levelGains.push(`防御+${exp1_level_def_total}`);
				exp1TotalGains.push(...levelGains);
			}

			if (exp1_atk_times > 0) {
				exp1Details.push(`攻击${exp1_atk_times}次`);
				exp1TotalGains.push(`攻击+${exp1_atk_total}（单独购买）`);
			}

			if (exp1_def_times > 0) {
				exp1Details.push(`防御${exp1_def_times}次`);
				exp1TotalGains.push(`防御+${exp1_def_total}（单独购买）`);
			}

			lines.push(`【五楼老人】交易${exp1_times}次（${exp1Details.join('，')}），总计：${exp1TotalGains.join('，')}`);
		}

		// 13楼老人
		let exp2_times = exp2_level_times + exp2_atk_times + exp2_def_times;
		if (exp2_times > 0) {
			let exp2Details = [];
			let exp2TotalGains = [];

			if (exp2_level_times > 0) {
				exp2Details.push(`升级${exp2_level_times}次`);
				let levelGains = [];
				if (exp2_level_hp_total > 0) levelGains.push(`生命+${exp2_level_hp_total}`);
				if (exp2_level_atk_total > 0) levelGains.push(`攻击+${exp2_level_atk_total}`);
				if (exp2_level_def_total > 0) levelGains.push(`防御+${exp2_level_def_total}`);
				exp2TotalGains.push(...levelGains);
			}

			if (exp2_atk_times > 0) {
				exp2Details.push(`攻击${exp2_atk_times}次`);
				exp2TotalGains.push(`攻击+${exp2_atk_total}（单独购买）`);
			}

			if (exp2_def_times > 0) {
				exp2Details.push(`防御${exp2_def_times}次`);
				exp2TotalGains.push(`防御+${exp2_def_total}（单独购买）`);
			}

			lines.push(`【13楼老人】交易${exp2_times}次（${exp2Details.join('，')}），总计：${exp2TotalGains.join('，')}`);
		}

		// 钥匙交易
		let key_buy_total = key_buy_yellow + key_buy_blue + key_buy_red;
		if (key_buy_total > 0) {
			let keyBuyDetails = [];
			if (key_buy_yellow > 0) keyBuyDetails.push(`黄钥匙${key_buy_yellow}把`);
			if (key_buy_blue > 0) keyBuyDetails.push(`蓝钥匙${key_buy_blue}把`);
			if (key_buy_red > 0) keyBuyDetails.push(`红钥匙${key_buy_red}把`);
			lines.push(`【购入钥匙】共${key_buy_total}把，花费金币${key_buy_gold}：${keyBuyDetails.join('，')}`);
		}

		let key_sell_total = key_sell_yellow + key_sell_blue + key_sell_red;
		if (key_sell_total > 0) {
			let keySellDetails = [];
			if (key_sell_yellow > 0) keySellDetails.push(`黄钥匙${key_sell_yellow}把`);
			if (key_sell_blue > 0) keySellDetails.push(`蓝钥匙${key_sell_blue}把`);
			if (key_sell_red > 0) keySellDetails.push(`红钥匙${key_sell_red}把`);
			lines.push(`【出售钥匙】共${key_sell_total}把，获得金币${key_sell_gold}：${keySellDetails.join('，')}`);
		}

		// 如果没有交易记录
		if (lines.length === 0) {
			core.insertAction([{
				"type": "text",
				"text": "尚未进行过任何交易。"
			}]);
			return;
		}

		// 生成总结文本
		const resultText = "\t[交易统计]\n" + lines.join("\n");

		core.insertAction(resultText);
	}
	//播放标题页面bgm
	control.prototype._playBgm_play = function (bgm, startTime) {
		if (core.musicStatus.playingBgm === bgm && !core.material.bgms[bgm].paused) return;

		if (core.musicStatus.playingBgm) {
			core.material.bgms[core.musicStatus.playingBgm].pause();
		}

		core.loader.loadBgm(bgm);
		const audio = core.material.bgms[bgm];
		audio.volume = core.musicStatus.userVolume * core.musicStatus.designVolume;
		audio.currentTime = startTime || 0;

		// 创建播放Promise并处理错误
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.then(() => {
				core.musicStatus.playingBgm = bgm;
				core.musicStatus.lastBgm = bgm;
			}).catch(e => {
				console.warn("播放失败:", e);

				if (e.name === 'NotAllowedError') {
					core.musicStatus.pendingBgm = { bgm, startTime };

					if (!core.userInteractionListenerAdded) {
						core.userInteractionListenerAdded = true;

						const playPendingBgm = () => {
							document.removeEventListener('click', playPendingBgm);
							core.userInteractionListenerAdded = false;

							const pending = core.musicStatus.pendingBgm;
							if (!pending) return;

							const audio = core.material.bgms[pending.bgm];
							audio.currentTime = pending.startTime || 0;

							// 添加重试播放逻辑
							const retryPlay = () => {
								audio.play().then(() => {
									core.musicStatus.playingBgm = pending.bgm;
									core.musicStatus.lastBgm = pending.bgm;
									core.musicStatus.pendingBgm = null;
								}).catch(retryError => {
									console.warn("重试播放失败:", retryError);
									if (retryError.name === 'NotAllowedError') {
										// 再次添加监听
										document.addEventListener('click', playPendingBgm);
										core.userInteractionListenerAdded = true;
									} else {
										core.musicStatus.pendingBgm = null;
									}
								});
							};

							retryPlay();
						};

						document.addEventListener('click', playPendingBgm);
					}
				} else {
					core.musicStatus.playingBgm = null;
				}
			});
		}
	};

	function doorCheck(x, y) {
		let block = core.getBlock(x, y);
		if (!block?.event) return false;

		const id = block.event.id;
		const isDoorLike = core.material.icons.animates[id] || core.material.icons.npc48[id];

		if (!isDoorLike) return false;

		const doorInfo = block.event.doorInfo;
		if (!doorInfo) return false;

		const keyInfo = doorInfo.keys || {};

		for (let rawName in keyInfo) {
			const needCount = keyInfo[rawName];
			const pureName = rawName.endsWith(':o') ? rawName.slice(0, -2) : rawName;

			const item = core.material.items[pureName];

			// — 道具不存在 —
			if (!item) {
				return false;
			}

			// — 数量不足 —
			if (core.itemCount(pureName) < needCount) {
				return false;
			}
		}
		return true;
	}
	//自动寻路会智能避开楼梯
	maps.prototype._automaticRoute_bfs = function (startX, startY, destX, destY) {
		var route = {},
			canMoveArray = this.generateMovableArray();
		// 使用优先队列
		var queue = new PriorityQueue({ comparator: function (a, b) { return a.depth - b.depth; } });
		route[startX + "," + startY] = '';
		queue.queue({ depth: 0, x: startX, y: startY });
		var blocks = core.getMapBlocksObj();
		while (queue.length != 0) {
			var curr = queue.dequeue(),
				deep = curr.depth,
				nowX = curr.x,
				nowY = curr.y;
			for (var direction in core.utils.scan) {
				if (!core.inArray(canMoveArray[nowX][nowY], direction)) continue;
				var nx = nowX + core.utils.scan[direction].x;
				var ny = nowY + core.utils.scan[direction].y;
				if (nx < 0 || nx >= core.bigmap.width || ny < 0 || ny >= core.bigmap.height || route[nx + "," + ny] != null) continue;
				// 重点
				if (nx == destX && ny == destY) {
					route[nx + "," + ny] = direction;
					break;
				}
				// 不可通行
				let block = core.getBlock(nx, ny);
				if (core.noPass(nx, ny) && block?.event?.cls !== 'items' && block?.event?.cls !== 'enemys' && !([81, 82, 83, 84, 85, 86].includes(block?.id))) continue;
				if (block?.event?.cls === 'enemys' && !core.canBattle(block.event.id, block.x, block.y)) continue;
				if ([81, 82, 83, 84, 85, 86].includes(block?.id) && !doorCheck(block.x, block.y)) continue;
				if (block && block.event.trigger === 'changeFloor') {
					var ignore = core.flags.ignoreChangeFloor;
					if (block.event.data && block.event.data.ignoreChangeFloor != null)
						ignore = block.event.data.ignoreChangeFloor;
					if (!ignore) continue;
				}
				route[nx + "," + ny] = direction;
				queue.queue({ depth: deep + this._automaticRoute_deepAdd(nx, ny, blocks), x: nx, y: ny });
			}
			if (route[destX + "," + destY] != null) break;
		}
		return route;
	}
	maps.prototype._automaticRoute_deepAdd = function (x, y, blocks) {
		// 判定每个可通行点的损耗值，越高越应该绕路
		var deepAdd = 1;
		var block = blocks[x + "," + y];
		if (block && !block.disable) {

			var id = block.event.id;
			// 绕过亮灯
			if (id == "light") deepAdd += 100;
			// 绕过路障
			if (id.endsWith("Net") && !core.hasFlag(id.substring(0, id.length - 3))) deepAdd += 100;
			// 绕过血瓶和绿宝石
			if (block.event.cls === 'items' && (id.endsWith("Potion") || id == 'greenGem')) deepAdd += 20;
			// 绕过传送点
			// if (block.event.trigger == 'changeFloor') deepAdd+=10;
			if (block.event.cls === 'enemys') deepAdd += 200;
			if ([81, 82, 83, 84, 85, 86].includes(block?.id)) deepAdd += 200;
		}

		// 绕过存在伤害的地方
		deepAdd += (core.status.checkBlock.damage[x + "," + y] || 0) * 100;
		// 绕过捕捉
		if (core.status.checkBlock.ambush[x + "," + y]) deepAdd += 1000;
		return deepAdd;
	}
},
    "战斗动画": function () {

	// =========================================================================
	// I. 核心与随机数 (Core & Random)
	// =========================================================================
	function rand(n) {
		return core.rand2(n);
	}

	// =========================================================================
	// II. 战斗UI配置常量
	// =========================================================================
	const BATTLE_CONFIG = {
		UI: {
			WIDTH: core.__PIXELS__ - 16,
			HEIGHT: 175,
			LEFT: 8,
			TOP: 32,
			BACKGROUND_COLOR: "gray",
			BACKGROUND_IMAGE: "url(project/materials/ground.png)",
			Z_INDEX: 66,
			FONT_FAMILY: "myFont1"
		},

		BORDER: {
			LINE_WIDTH: 4,
			STROKE_STYLE: "#cc6600"
		},

		FONT: {
			NAME_SIZE: 30,
			NAME_COLOR: "white",
			NAME_FAMILY: "STXingkai",
			STATUS_NAME_SIZE: 11,
			STATUS_VALUE_SIZE: 16,
			STATUS_FAMILY: "Verdana"
		},

		VICTORY: {
			TEXT: "战斗胜利",
			FONT_FAMILY: "STXingkai",
			FONT_SIZE: 65,
			COLOR_TOP: "#ff4a4f",
			COLOR_BOTTOM: "#ffcccc",
			OFFSET_X: 2,
			OFFSET_Y: 2,
			FADE_DURATION: 500
		},

		CHARACTER_BOX: {
			LEFT_X: 8,
			Y: 20,
			SIZE: 70,
			BORDER_WIDTH: 3
		},

		HORIZONTAL_LINES: {
			COUNT: 3,
			LENGTH: 65,
			WIDTH: 2,
			COLOR: "white",
			DISTANCE_FROM_BOX: 5,
			TOP_OFFSET: 35,
			SPACING: 40
		},

		ANIMATION: {
			FRAME_INTERVAL: core.values.animateSpeed - 50,
			// 默认回合间隔常量（可在游戏中通过 变量/Flag '回合间隔' 覆盖）
			DEFAULT_TURN_INTERVAL: 375,
			CRITICAL_THRESHOLD: 200
		},

		ENEMY_ICON: {
			WIDTH: 32,
			HEIGHT: 48
		},

		STATUS_LABELS: {
			hp: "生命值",
			atk: "攻击力",
			def: "防御力"
		},

		BATTLE_STATUS: {
			BATTLING: "isBattling",
			AFTER_BATTLE: "afterBattle"
		},

		SOUNDS: {
			FAIL: "操作失败",
			BLOCK: "格挡",
			HURT: "受伤",
			CRITICAL: "暴击",
			ATTACK: "攻击",
			GAME_OVER: "游戏失败"
		},

		SPECIAL_SKILLS: {
			FIRST_ATTACK: 1,
			PIERCE_DEFENSE: 2,
			DOUBLE_ATTACK: 4,
			TRIPLE_ATTACK: 5,
			MULTI_ATTACK: 6,
			BREAK_ARMOR: 7,
			PURIFY: 9,
			VAMPIRE: 11,
			FIXED_DAMAGE: 22
		}
	};

	const getCharacterBoxRightX = () => {
		return BATTLE_CONFIG.UI.WIDTH - BATTLE_CONFIG.CHARACTER_BOX.LEFT_X - BATTLE_CONFIG.CHARACTER_BOX.SIZE;
	};

	// 获取当前回合间隔的辅助函数
	const getTurnInterval = () => {
		return core.getFlag('回合间隔', BATTLE_CONFIG.ANIMATION.DEFAULT_TURN_INTERVAL);
	};

	// =========================================================================
	// III. 战斗逻辑模块
	// =========================================================================

	const battleModule = {
		battleInfo: {
			width: BATTLE_CONFIG.UI.WIDTH,
			height: BATTLE_CONFIG.UI.HEIGHT,
			left: BATTLE_CONFIG.UI.LEFT,
			top: BATTLE_CONFIG.UI.TOP,
			bx: BATTLE_CONFIG.CHARACTER_BOX.LEFT_X,
			by: BATTLE_CONFIG.CHARACTER_BOX.Y,
			size: BATTLE_CONFIG.CHARACTER_BOX.SIZE
		},

		/**
		 * 绘制背景横线
		 */
		drawHorizontalLines: function (ctx) {
			const lineConfig = BATTLE_CONFIG.HORIZONTAL_LINES;
			const strokeStyle = lineConfig.COLOR;
			const lineWidth = lineConfig.WIDTH;

			const leftBoxRightX = BATTLE_CONFIG.CHARACTER_BOX.LEFT_X + BATTLE_CONFIG.CHARACTER_BOX.SIZE;
			const rightBoxX = getCharacterBoxRightX();
			const startY = lineConfig.TOP_OFFSET;

			for (let i = 0; i < lineConfig.COUNT; i++) {
				const y = startY + i * lineConfig.SPACING;
				// 左侧线
				const leftLineX = leftBoxRightX + lineConfig.DISTANCE_FROM_BOX;
				core.drawLine(ctx, leftLineX, y, leftLineX + lineConfig.LENGTH, y, strokeStyle, lineWidth);
				// 右侧线
				const rightLineX = rightBoxX - lineConfig.DISTANCE_FROM_BOX - lineConfig.LENGTH;
				core.drawLine(ctx, rightLineX, y, rightLineX + lineConfig.LENGTH, y, strokeStyle, lineWidth);
			}
		},

		/**
		 * 绘制战斗胜利文字
		 */
		drawVictoryText: function (ctx) {
			var config = BATTLE_CONFIG.VICTORY;
			var x = BATTLE_CONFIG.UI.WIDTH / 2;
			var y = BATTLE_CONFIG.UI.HEIGHT / 2;
			var font = config.FONT_SIZE + "px " + config.FONT_FAMILY;

			core.setTextAlign(ctx, "center");
			core.setTextBaseline(ctx, "middle");

			// 下层（阴影）
			core.fillText(ctx, config.TEXT, x + config.OFFSET_X, y + config.OFFSET_Y, config.COLOR_BOTTOM, font);
			// 上层
			core.fillText(ctx, config.TEXT, x, y, config.COLOR_TOP, font);
		},

		/**
		 * 战斗胜利退出动画
		 */
		animateVictoryExit: function (callback) {
			var info = core.plugin.battleInfo;
			var maskCtx = core.createCanvas(
				"__battle_mask__",
				info.left,
				info.top,
				info.width,
				info.height,
				BATTLE_CONFIG.UI.Z_INDEX + 1
			);

			var startTime = Date.now();
			var duration = BATTLE_CONFIG.VICTORY.FADE_DURATION;
			var MAX_ALPHA = 0.3;

			var loop = function () {
				var now = Date.now();
				var elapsed = now - startTime;
				var t = Math.min(1, elapsed / duration);
				var alpha = MAX_ALPHA * t;

				maskCtx.clearRect(0, 0, info.width, info.height);
				maskCtx.fillStyle = "rgba(0,0,0," + alpha + ")";
				maskCtx.fillRect(0, 0, info.width, info.height);

				if (elapsed >= duration) {
					if (callback) callback();
				} else {
					requestAnimationFrame(loop);
				}
			};
			requestAnimationFrame(loop);
		},

		init_battle_hooks: function () {
			core.control.unlockControl = function () {
				if (!((core.status.hero || {}).isBattling || (core.status.hero || {}).battleStatus == BATTLE_CONFIG.BATTLE_STATUS.AFTER_BATTLE)) core.status.lockControl = false;
			};

			core.events.battle = function (id, x, y, force, callback) {
				core.saveAndStopAutomaticRoute();
				id = id || core.getBlockId(x, y);
				if (!id || !core.material.enemys[id]) return core.clearContinueAutomaticRoute(callback);

				if (!core.enemys.canBattle(id, x, y) && !force) {
					core.stopSound();
					core.playSound(BATTLE_CONFIG.SOUNDS.FAIL);
					let d = core.getDamageInfo(id, null, x, y);
					if (!d || core.status.hero.hp <= d.damage)
						core.drawTip("你打不过此怪物！", null, true);
					else
						core.drawTip("你的血量不够无暴击计算的预期伤害，无法开战！", null, true);
					return core.clearContinueAutomaticRoute(callback);
				}

				if (!core.beforeBattle(id, x, y)) return core.clearContinueAutomaticRoute(flags.__callback__);
				if (!core.status.event.id && x === core.nextX() && y === core.nextY()) core.plugin.autosaveFromSnapshot();

				if (core.getFlag('战斗动画') && !core.isReplaying()) {
					core.lockControl();
					var enemy = core.getEnemyInfo(id, null, x, y);
					var enemyInfo = core.clone(core.material.enemys[id]);
					enemy.id = enemyInfo.id;
					enemy.atkTimes = 1;
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.DOUBLE_ATTACK)) enemy.atkTimes = 2;
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.TRIPLE_ATTACK)) enemy.atkTimes = 3;
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.MULTI_ATTACK)) enemy.atkTimes = enemy.n || 4;

					// 特殊技能预处理
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.BREAK_ARMOR)) {
						core.addStatus('hp', -Math.floor((enemyInfo.breakArmor || core.values.breakArmor) * core.getStatus('def')));
					}
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.PURIFY))
						core.addStatus('hp', -Math.floor((enemyInfo.purify || core.values.purify) * core.getStatus('mdef')));
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.VAMPIRE)) {
						var vampire_damage = Math.floor(core.getStatus('hp') * enemyInfo.vampire);
						core.addStatus('hp', -vampire_damage);
						if (enemy.add) enemy.hp += vampire_damage;
					}
					if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.FIXED_DAMAGE))
						core.addStatus('hp', -enemyInfo.damage);

					core.status.battle_heroHp = core.status.hero.hp;
					core.status.hero.battle_enemy = enemy;
					core.battle_drawUI();

					core.status.hero.isBattling = true;
					flags.__callback__ = callback;
					flags.__loc__ = [x, y];

					var enemyEvent = [{ "type": "function", "function": "function(){core.battle_enemyAttack();}" }];
					var heroEvent = [{ "type": "function", "function": "function(){core.battle_heroAttack()}" }];
					var battleEvent = heroEvent.concat(enemyEvent);
					if (core.hasSpecial(enemy, BATTLE_CONFIG.SPECIAL_SKILLS.FIRST_ATTACK)) battleEvent = enemyEvent.concat(heroEvent);

					core.insertAction([{ "type": "while", "condition": "core.status.hero.isBattling", "data": [{ "type": "sleep", "time": 50 }].concat(battleEvent) }]);
				} else {
					core.afterBattle(id, x, y, callback);
				}
			};

			core.afterBattle = function (enemyId, x, y, dr = true) {
				return core.events.eventdata.afterBattle(enemyId, x, y, dr);
			}
		},

		battle_drawUI: function () {
			var info = core.plugin.battleInfo;
			var ctx = core.getContextByName("__battle__") || core.createCanvas("__battle__", info.left, info.top, info.width, info.height, BATTLE_CONFIG.UI.Z_INDEX);

			core.setAlpha(ctx, 1);
			ctx.canvas.style.opacity = 1;
			ctx.canvas.style.backgroundColor = BATTLE_CONFIG.UI.BACKGROUND_COLOR;
			ctx.canvas.style.backgroundImage = BATTLE_CONFIG.UI.BACKGROUND_IMAGE;

			var lineWidth = BATTLE_CONFIG.BORDER.LINE_WIDTH,
				strokeStyle = BATTLE_CONFIG.BORDER.STROKE_STYLE;
			core.strokeRect(ctx, lineWidth / 2, lineWidth / 2, info.width - lineWidth, info.height - lineWidth, strokeStyle, lineWidth);

			var bx = info.bx,
				by = info.by,
				size = info.size;
			var bx2 = getCharacterBoxRightX();

			// 绘制英雄
			var heroImg = core.material.images.hero;
			core.drawImage(ctx, heroImg, 0, 0, 32, 32, bx2, by, size, size);
			core.strokeRect(ctx, bx2, by, size, size, strokeStyle, BATTLE_CONFIG.CHARACTER_BOX.BORDER_WIDTH);

			this.drawHorizontalLines(ctx);

			// 绘制名称
			var nameFont = BATTLE_CONFIG.FONT.NAME_SIZE + "px " + BATTLE_CONFIG.FONT.NAME_FAMILY;
			core.setTextAlign(ctx, "center");
			core.fillText(ctx, "怪物", bx + size / 2, by + size + BATTLE_CONFIG.FONT.NAME_SIZE, BATTLE_CONFIG.FONT.NAME_COLOR, nameFont);
			core.fillText(ctx, "勇士", bx2 + size / 2, by + size + BATTLE_CONFIG.FONT.NAME_SIZE, BATTLE_CONFIG.FONT.NAME_COLOR, nameFont);

			// 绘制怪物及动画
			var enemy = core.status.hero.battle_enemy;
			var block = core.getBlockInfo(enemy.id);
			var enemyImg = core.material.images[block.height === 48 ? "enemy48" : "enemys"];
			var aa = 1;

			const drawEnemyFrame = () => {
				core.clearMap(ctx, bx - 2, by - 2, size + 4, size + 4);
				core.drawImage(ctx, enemyImg, (aa - 1) * 32, block.posY * block.height, 32, block.height, bx, by, size, size);
				core.strokeRect(ctx, bx, by, size, size, strokeStyle, BATTLE_CONFIG.CHARACTER_BOX.BORDER_WIDTH);
				aa = (aa % block.animate) + 1;
			};
			drawEnemyFrame();

			if (!(core.isReplaying() || main.replayChecking)) {
				var box_enemy = window.setInterval(function () {
					if (!core.status.hero.isBattling) return clearInterval(box_enemy);
					drawEnemyFrame();
				}, BATTLE_CONFIG.ANIMATION.FRAME_INTERVAL);
			}
			core.battle_battling_draw(null, enemy);
		},

		battle_battling_draw: function (hero, enemy) {
			if (typeof enemy == "string") enemy = core.material.enemys[enemy];
			if (!hero) hero = core.clone(core.status.hero);
			hero.hp = core.status.battle_heroHp;

			var ctx = core.getContextByName("__battle__");
			if (!ctx) return;

			var info = core.plugin.battleInfo;
			var bx = info.bx,
				size = info.size;
			var bx2 = getCharacterBoxRightX();
			const lineConfig = BATTLE_CONFIG.HORIZONTAL_LINES;

			// 清理中间区域
			const clearStartX = bx + size + 2;
			const clearWidth = bx2 - clearStartX - 2;
			ctx.clearRect(clearStartX, 5, clearWidth, info.height - 10);

			// 重绘 VS
			const vsW = 81,
				vsH = 73;
			const vsX = (info.width / 2) - (vsW / 2);
			const vsY = (info.height / 2) - (vsH / 2);
			core.drawImage(ctx, "VS.png", vsX, vsY, vsW, vsH);

			this.drawHorizontalLines(ctx);

			var nameFont = BATTLE_CONFIG.FONT.STATUS_NAME_SIZE + "px " + BATTLE_CONFIG.FONT.STATUS_FAMILY;
			var valueFont = "bold italic " + BATTLE_CONFIG.FONT.STATUS_VALUE_SIZE + "px " + BATTLE_CONFIG.FONT.STATUS_FAMILY;
			var textColor = BATTLE_CONFIG.FONT.NAME_COLOR;

			const startY = lineConfig.TOP_OFFSET;
			const leftLineX = bx + size + lineConfig.DISTANCE_FROM_BOX;
			const leftLineEndX = leftLineX + lineConfig.LENGTH;
			const rightLineX = bx2 - lineConfig.DISTANCE_FROM_BOX - lineConfig.LENGTH;
			const rightLineEndX = rightLineX + lineConfig.LENGTH;

			const statusKeys = Object.keys(BATTLE_CONFIG.STATUS_LABELS);
			for (let i = 0; i < statusKeys.length; i++) {
				const status = statusKeys[i];
				const label = BATTLE_CONFIG.STATUS_LABELS[status];
				const y = startY + i * lineConfig.SPACING;

				// 左侧 (怪物)
				core.setTextAlign(ctx, "left");
				core.setTextBaseline(ctx, "bottom");
				core.fillText(ctx, label + "：", leftLineX, y - 2, textColor, nameFont);
				core.setTextAlign(ctx, "right");
				core.setTextBaseline(ctx, "top");
				core.fillText(ctx, (enemy[status] || 0).toString(), leftLineEndX, y + 6, textColor, valueFont);

				// 右侧 (勇士)
				core.setTextAlign(ctx, "right");
				core.setTextBaseline(ctx, "bottom");
				core.fillText(ctx, "：" + label, rightLineEndX, y - 2, textColor, nameFont);
				core.setTextAlign(ctx, "left");
				core.setTextBaseline(ctx, "top");
				core.fillText(ctx, (hero[status] || 0).toString(), rightLineX, y + 6, textColor, valueFont);
			}

			if (core.status.battle_heroHp <= 0) {
				core.playSound(BATTLE_CONFIG.SOUNDS.GAME_OVER);
				return core.lose("战斗失败");
			}

			// 胜利判定
			if (core.status.battle_heroHp > 0 && core.status.hero.battle_enemy.hp <= 0) {
				if (core.status.hero.battleStatus === BATTLE_CONFIG.BATTLE_STATUS.AFTER_BATTLE) return;
				core.status.hero.battleStatus = BATTLE_CONFIG.BATTLE_STATUS.AFTER_BATTLE;
				core.status.hero.isBattling = false;

				var damage = core.status.hero.hp - core.status.battle_heroHp;
				core.status.hero.hp = core.status.battle_heroHp;
				core.status.hero.statistics.battleDamage += damage;



				battleModule.drawVictoryText(ctx);
				battleModule.animateVictoryExit(function () {
					core.hideBlock(flags.__loc__[0], flags.__loc__[1]);
					core.afterBattle(enemy.id, flags.__loc__[0], flags.__loc__[1], false);
					if (flags.__callback__) flags.__callback__();
					core.battle_exit();
				});
				return;
			}
		},

		battle_exit: function () {
			core.status.hero.isBattling = false;
			core.status.hero.battle_enemy = null;
			core.status.hero.battleStatus = null;
			core.deleteCanvas("__battle_mask__");
			core.deleteCanvas("__battle__");
			//core.unlockControl();
		},

		battle_enemyAttack: function () {
			if (!core.status.hero.isBattling) return;
			var enemy = core.status.hero.battle_enemy;
			var atkTimes = enemy.atkTimes || 1;
			var interval = getTurnInterval();

			for (var i = 0; i < atkTimes; i++) {
				var damage = Math.max(0, enemy.atk - core.status.hero.def);
				if (core.hasSpecial(enemy.special, BATTLE_CONFIG.SPECIAL_SKILLS.PIERCE_DEFENSE)) damage = enemy.atk;

				core.insertAction([
					{ "type": "playSound", "name": damage > 0 ? BATTLE_CONFIG.SOUNDS.HURT : BATTLE_CONFIG.SOUNDS.BLOCK },
					{ "type": "function", "function": `function(){core.status.battle_heroHp -= ${damage}; core.battle_battling_draw(null, core.status.hero.battle_enemy);}` },
					{ "type": "sleep", "time": interval }
				]);
			}
		},

		battle_heroAttack: function () {
			if (!core.status.hero.isBattling) return;
			var enemy = core.status.hero.battle_enemy;
			var times = core.getRealStatus('atkTimes') || 1;
			var interval = getTurnInterval();

			while (times-- > 0) {
				var isCrit = rand(BATTLE_CONFIG.ANIMATION.CRITICAL_THRESHOLD) < core.getStatus('lv');
				var damage = Math.max(0, core.status.hero.atk - enemy.def) * (isCrit ? 2 : 1);
				core.insertAction([
					{ "type": "playSound", "name": isCrit ? BATTLE_CONFIG.SOUNDS.CRITICAL : BATTLE_CONFIG.SOUNDS.ATTACK },
					{ "type": "function", "function": `function(){core.status.hero.battle_enemy.hp = Math.max(0, core.status.hero.battle_enemy.hp - ${damage}); core.battle_battling_draw(null, core.status.hero.battle_enemy);}` },
					{ "type": "sleep", "time": interval }
				]);
			}
		}
	};

	// 注册函数
	core.plugin.battleInfo = battleModule.battleInfo;
	this.battle_drawUI = battleModule.battle_drawUI;
	this.battle_battling_draw = battleModule.battle_battling_draw;
	this.battle_exit = battleModule.battle_exit;
	this.battle_heroAttack = battleModule.battle_heroAttack;
	this.battle_enemyAttack = battleModule.battle_enemyAttack;
	this.drawHorizontalLines = battleModule.drawHorizontalLines;
	battleModule.init_battle_hooks();

	/**
	 * 显示一个带“左右展开动画”的文本弹窗
	 */
	core.plugin.showTextPopup = function (text, options = {}) {
		if (core.isReplaying()) {
			core.doAction();
			return;
		}
		core.lockControl();
		const info = core.plugin.battleInfo;
		const width = options.width || info.width;
		const height = options.height || 64;
		const top = options.top || 96;
		const animationDuration = options.duration || 200;
		const stayTime = options.stay || 100;
		const canvasName = "__text_popup__";

		const ctx = core.createCanvas(canvasName, info.left, top, width, height, BATTLE_CONFIG.UI.Z_INDEX + 5);
		const lineWidth = BATTLE_CONFIG.BORDER.LINE_WIDTH;
		const strokeStyle = BATTLE_CONFIG.BORDER.STROKE_STYLE;

		ctx.font = "25px Verdana";
		ctx.fillStyle = BATTLE_CONFIG.FONT.NAME_COLOR;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const bgImage = core.material.images.images['ground.png'];
		const bgPattern = ctx.createPattern(bgImage, "repeat");

		const draw = function (visibleWidth) {
			ctx.clearRect(0, 0, width, height);
			const clipX = (width - visibleWidth) / 2;
			ctx.save();
			ctx.beginPath();
			ctx.rect(clipX, 0, visibleWidth, height);
			ctx.clip();
			ctx.fillStyle = bgPattern;
			ctx.fillRect(0, 0, width, height);
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = strokeStyle;
			const half = lineWidth / 2;
			ctx.strokeRect(half, half, width - lineWidth, height - lineWidth);
			ctx.fillStyle = BATTLE_CONFIG.FONT.NAME_COLOR;
			ctx.fillText(text, width / 2, height / 2);
			ctx.restore();
		};

		const startTime = performance.now();
		const animate = function (now) {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / animationDuration, 1);
			const eased = 1 - Math.pow(1 - t, 3);
			draw(width * eased);
			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				setTimeout(() => {
					core.deleteCanvas(canvasName);
					core.doAction();
				}, stayTime);
			}
		};
		requestAnimationFrame(animate);
	};
},
    "额外楼传": function () {


	// ========================================================================
	// 以下是你原有的路径查找算法，保持原样（微调了部分注释以保持清晰）
	// ========================================================================

	// 判定指定楼层两点间能否瞬移连通
	this.canConnect = function (fromX, fromY, toX, toY, floorId) {
		const floor = core.floors[floorId];

		// 检查坐标是否在楼层范围内
		const isCoordValid = (x, y) => x >= 0 && y >= 0 && x < floor.width && y < floor.height;
		if (!isCoordValid(fromX, fromY) || !isCoordValid(toX, toY)) {
			return false;
		}

		// 起点终点相同，直接判定可连通
		if (fromX === toX && fromY === toY) {
			return true;
		}

		// 步骤3：起点合法性检查
		if (!_canConnect_checkStartPoint(fromX, fromY, floorId)) {
			return false;
		}

		// 步骤4：生成目标楼层的可移动数组
		const canMoveArray = core.maps.generateMovableArray(floorId);
		if (!canMoveArray) {
			return false;
		}

		// 步骤5：获取目标楼层的地图数据
		const blocksObj = core.maps.getMapBlocksObj(floorId);
		const bgMap = core.maps.getBgMapArray(floorId);

		// 步骤6：BFS遍历检查路径连通性
		return _canConnect_bfs(fromX, fromY, toX, toY, floorId, canMoveArray, blocksObj, bgMap);
	};

	// 辅助：起点合法性检查
	var _canConnect_checkStartPoint = function (sx, sy, floorId) {
		const key = sx + "," + sy;
		core.updateCheckBlock(floorId)
		if (core.flags.checkBlock[floorId].damage[key]) return false;
		const block = core.getBlock(sx, sy, floorId);
		if (block != null) {
			// 仅起点是传送点（trigger=changeFloor）时允许
			return block.event?.trigger === 'changeFloor';
		}
		return true;
	};

	// 辅助：BFS遍历检查路径连通性
	var _canConnect_bfs = function (sx, sy, ex, ey, floorId, canMoveArray, blocksObj, bgMap) {
		const floor = core.floors[floorId];
		const visited = {};
		const queue = [sx + "," + sy];
		visited[sx + "," + sy] = true;

		while (queue.length > 0) {
			const currKey = queue.shift();
			const [currX, currY] = currKey.split(",").map(Number);

			for (const direction in core.utils.scan) {
				if (!core.inArray(canMoveArray[currX][currY], direction)) continue;

				const dx = core.utils.scan[direction].x;
				const dy = core.utils.scan[direction].y;
				const nx = currX + dx;
				const ny = currY + dy;
				const nextKey = nx + "," + ny;

				if (nx < 0 || ny < 0 || nx >= floor.width || ny >= floor.height) continue;
				if (visited[nextKey]) continue;

				// 检查下一个点是否符合瞬移条件
				if (!_canConnect_checkNextPoint(blocksObj, nx, ny, floorId)) continue;

				visited[nextKey] = true;

				if (nx === ex && ny === ey) {
					const endBlock = blocksObj[nextKey];
					// 终点有可触发事件且未禁用 → 不可瞬移
					if (endBlock && !endBlock.disable && endBlock.event?.trigger) {
						return false;
					}
					return true;
				}

				queue.push(nextKey);
			}
		}
		return false;
	};

	// 辅助：检查下一个点是否符合瞬移条件
	var _canConnect_checkNextPoint = function (blocksObj, x, y, floorId) {
		const key = x + "," + y;
		const block = blocksObj[key];

		if (block && !block.disable) {
			if (block.event?.noPass || block.event?.script || block.event?.event) {
				return false;
			}
			if (block.event?.trigger) {
				if (block.event.trigger !== 'changeFloor') return false;
				let ignore = core.flags.ignoreChangeFloor;
				if (block.event.data && block.event.data.ignoreChangeFloor != null) {
					ignore = block.event.data.ignoreChangeFloor;
				}
				if (!ignore) return false;
			}
		}
		core.updateCheckBlock(floorId)
		if (core.flags.checkBlock[floorId].damage[key]) return false;
		if (core.flags.checkBlock[floorId].repulse[key]) return false;
		if (core.flags.checkBlock[floorId].ambush[key]) return false;
		return true;
	};

	// 楼层间是否连通的判断
	this.floorTofloor = function (floorId) {

		const currentFloorIndex = core.floorIds.indexOf(core.status.floorId);
		const targetFloorIndex = core.floorIds.indexOf(floorId);

		if (targetFloorIndex === -1) {
			return false;
		}
		if (main.floors[floorId].isHide) return true

		// 优先判断原地
		if (floorId === core.status.floorId) {
			const floorDown = main.floors[floorId].downFloor;
			core.flags.popfly = floorId
			return core.canMoveDirectly(floorDown[0], floorDown[1]) !== -1;
		}

		// 相邻楼层判断
		if (Math.abs(targetFloorIndex - currentFloorIndex) === 1) {
			if (currentFloorIndex === 0 || currentFloorIndex === 44) return true
			// 向上
			if (targetFloorIndex > currentFloorIndex) {
				core.flags.popfly = core.status.floorId
				return core.plugin.canConnect(hero.loc.x, hero.loc.y, main.floors[core.status.floorId].upFloor[0], main.floors[core.status.floorId].upFloor[1], core.status.floorId)
			}
			// 向下
			if (targetFloorIndex < currentFloorIndex) {
				core.flags.popfly = core.status.floorId
				return core.plugin.canConnect(hero.loc.x, hero.loc.y, main.floors[core.status.floorId].downFloor[0], main.floors[core.status.floorId].downFloor[1], core.status.floorId)
			}
		}

		// 递归检查
		if (targetFloorIndex > currentFloorIndex) {
			const prevFloorIndex = targetFloorIndex - 1;
			const prevFloorId = core.floorIds[prevFloorIndex];
			const floorUp = main.floors[prevFloorId].upFloor;
			const floorDown = main.floors[prevFloorId].downFloor;
			core.flags.popfly = prevFloorId
			if (main.floors[prevFloorId].isHide) return this.floorTofloor(prevFloorId)

			// 注意：这里使用 plugin.canConnect
			if (core.plugin.canConnect(floorUp[0], floorUp[1], floorDown[0], floorDown[1], prevFloorId)) {
				return this.floorTofloor(prevFloorId);
			}
		}

		if (targetFloorIndex < currentFloorIndex) {
			const nextFloorIndex = targetFloorIndex + 1;
			const nextFloorId = core.floorIds[nextFloorIndex];
			const floorUp = main.floors[nextFloorId].upFloor;
			const floorDown = main.floors[nextFloorId].downFloor;
			core.flags.popfly = nextFloorId
			if (main.floors[nextFloorId].isHide) return this.floorTofloor(nextFloorId)

			if (core.plugin.canConnect(floorUp[0], floorUp[1], floorDown[0], floorDown[1], nextFloorId)) {
				return this.floorTofloor(nextFloorId);
			}
		}

		return false;
	};

	// 楼层传送器逻辑 (保持原样)
	core.flyTo = function (toId, callback) {
		var fromId = core.status.floorId;
		if (!core.getFlag('fly')) {
			if (!core.plugin.floorTofloor(toId)) {
				core.playSound('操作失败');
				core.drawTip("无法飞往" + core.status.maps[toId].title + "！" + "因为" + core.flags.popfly + "存在障碍", 'fly')
				return false;
			}
		}

		if (!core.status.maps[fromId].canFlyFrom || !core.status.maps[toId].canFlyTo || !core.hasVisitedFloor(toId)) {
			core.playSound('操作失败');
			core.drawTip("无法飞往" + core.status.maps[toId].title + "！", 'fly');
			return false;
		}

		var stair = null,
			loc = null;
		if (core.flags.flyRecordPosition) {
			loc = core.getFlag("__leaveLoc__", {})[toId] || null;
		}
		if (core.status.maps[toId].flyPoint != null && core.status.maps[toId].flyPoint.length == 2) {
			stair = 'flyPoint';
		}
		if (stair == null && loc == null) {
			var fromIndex = core.floorIds.indexOf(fromId),
				toIndex = core.floorIds.indexOf(toId);
			var stair = fromIndex <= toIndex ? "downFloor" : "upFloor";
			if (fromIndex == toIndex && core.status.maps[fromId].underGround) stair = "upFloor";
		}

		core.status.route.push("fly:" + toId);
		core.ui.closePanel();
		core.setFlag('__isFlying__', true);
		core.changeFloor(toId, stair, loc, null, function () {
			core.removeFlag("__isFlying__");
			if (callback) callback();
		});

		return true;
	}


	// ========================================================================
	// 【修改 1】覆写系统原有的 openShop 事件
	// 目的：在玩家踩到商店并打开时，记录该商店所在的楼层和坐标
	// ========================================================================
	events.prototype._action_openShop = function (data, x, y, prefix) {
		// 调用修改后的 setShopVisited，传入 x, y 和 floorId
		core.plugin.setShopVisited(data.id, true, x, y, core.status.floorId);

		if (data.open) core.openShop(data.id, true);
		core.doAction();
	}

	// ========================================================================
	// 【修改 2】设置商店访问状态函数
	// 目的：将商店的坐标信息 (x, y, floorId) 存储在 core.flags.__shops__ 中
	// ========================================================================
	this.setShopVisited = function (id, visited, x, y, floorId) {
		if (!core.hasFlag("__shops__")) core.setFlag("__shops__", {});
		var shops = core.getFlag("__shops__");

		if (!shops[id]) shops[id] = {};

		if (visited) {
			shops[id].visited = true;
			// 新增：如果传入了坐标信息，记录商店的具体位置
			if (x != null && y != null && floorId != null) {
				shops[id].loc = {
					x: x,
					y: y,
					floorId: floorId
				};
			}
		} else {
			delete shops[id].visited;
			// 根据需求，取消访问时可以选择是否删除位置记录，这里暂不删除以保留历史位置
		}
	}

	// ========================================================================
	// 【新增】检查商店可达性 (核心逻辑)
	// 目的：判断当前勇者位置是否能“物理”走到目标商店位置
	// ========================================================================
	this.checkShopAccessibility = function (shopId) {
		var shops = core.getFlag("__shops__");
		if (!shops || !shops[shopId]) return false;

		// 如果没有记录位置信息（例如旧存档读取），默认允许访问
		if (!shops[shopId].loc) return true;

		var targetLoc = shops[shopId].loc;
		var targetFloorId = targetLoc.floorId;
		var currentFloorId = core.status.floorId;

		// 定义本层检测的起点坐标
		var startX, startY;

		// 情况一：商店在当前楼层
		if (targetFloorId === currentFloorId) {
			startX = core.getHeroLoc('x');
			startY = core.getHeroLoc('y');
		}
		// 情况二：商店在不同楼层
		else {
			// 1. 先判断楼层间是否连通 (勇者能否到达目标楼层)
			if (!core.getFlag('fly') && !core.plugin.floorTofloor(targetFloorId)) {
				return false;
			}

			// 2. 计算勇者到达目标楼层时的落脚点（楼梯口）
			var currentFloorIndex = core.floorIds.indexOf(currentFloorId);
			var targetFloorIndex = core.floorIds.indexOf(targetFloorId);
			var targetFloorData = core.floors[targetFloorId];

			if (currentFloorIndex < targetFloorIndex) {
				// 往上走到达目标层 -> 出现在目标层的下楼梯处
				if (!targetFloorData.downFloor) return false;
				startX = targetFloorData.downFloor[0];
				startY = targetFloorData.downFloor[1];
			} else {
				// 往下走到达目标层 -> 出现在目标层的上楼梯处
				if (!targetFloorData.upFloor) return false;
				startX = targetFloorData.upFloor[0];
				startY = targetFloorData.upFloor[1];
			}
		}

		// 3. 【修改】检查起点到商店周围四点（上下左右）是否有一点可达
		// 因为商店本身通常是不可通行的障碍物，直接检测到商店坐标会返回不可达
		for (var dir in core.utils.scan) {
			var nx = targetLoc.x + core.utils.scan[dir].x;
			var ny = targetLoc.y + core.utils.scan[dir].y;

			// 使用 canConnect 判断能否到达该相邻点
			// canConnect 内部会自动处理边界检查
			if (core.plugin.canConnect(startX, startY, nx, ny, targetFloorId)) {
				return true;
			}
		}

		return false;
	}

	// ========================================================================
	// 【修改 3】转换商店事件
	// 目的：在快捷商店的判断条件中加入 checkShopAccessibility
	// ========================================================================
	this._convertShop = function (shop) {
		return [
			{ "type": "function", "function": "function() {core.addFlag('@temp@shop', 1);}" },
			{
				"type": "while",
				"condition": "true",
				"data": [
					// 检测能否访问该商店
					{
						"type": "if",
						// 【关键修改】：同时检查 isShopVisited 和 checkShopAccessibility
						"condition": "core.isShopVisited('" + shop.id + "') && core.plugin.checkShopAccessibility('" + shop.id + "')",
						"true": [
							// 可以访问且路径连通
							{ "type": "function", "function": "function() { core.plugin._convertShop_replaceChoices('" + shop.id + "', false) }" },
						],
						"false": [
							// 无法访问（未访问过 或 路径不通）
							{
								"type": "if",
								"condition": shop.disablePreview,
								"true": [
									// 不可预览，提示并退出
									{ "type": "playSound", "name": "操作失败" },
									"当前无法到达或访问该商店！",
									{ "type": "break" },
								],
								"false": [
									// 可以预览模式
									{ "type": "tip", "text": "当前处于预览模式，不可购买（未访问或路径不通）" },
									{ "type": "function", "function": "function() { core.plugin._convertShop_replaceChoices('" + shop.id + "', true) }" },
								]
							}
						]
					}
				]
			},
			{ "type": "function", "function": "function() {core.addFlag('@temp@shop', -1);}" }
		];
	}
},
    "物品显示信息": function () {
	/* 宝石血瓶左下角显示数值
	 * 需要将 变量：itemDetail改为true才可正常运行
	 * 请尽量减少勇士的属性数量，否则可能会出现严重卡顿（划掉，现在你放一万个属性也不会卡）
	 * 注意：这里的属性必须是core.status.hero里面的，flag无法显示
	 * 如果不想显示，可以core.setFlag("itemDetail", false);
	 * 然后再core.getItemDetail();
	 * 如有bug在大群或造塔群@古祠
	 */

	const ignore = ['centerFly', 'superPotion'];

	// 取消注释下面这句可以减少超大地图的判定。
	// 如果地图宝石过多，可能会略有卡顿，可以尝试取消注释下面这句话来解决。
	// core.bigmap.threshold = 256;
	const origin = core.control.updateStatusBar;
	core.updateStatusBar = core.control.updateStatusBar = function () {
		if (core.getFlag('__statistics__')) return;
		else return origin.apply(core.control, arguments);
	}

	items.prototype.getItemEffect = function (itemId, itemNum) {
		var itemCls = core.material.items[itemId].cls;
		// 消耗品
		if (itemCls === 'items') {
			var curr_hp = core.status.hero.hp;
			var itemEffect = core.material.items[itemId].itemEffect;
			if (itemEffect) {
				try {
					for (var i = 0; i < itemNum; ++i)
						eval(itemEffect);
				} catch (e) {
					main.log(e);
				}
			}
			if (!core.getFlag('__statistics__', false))
				core.status.hero.statistics.hp += core.status.hero.hp - curr_hp;

			var useItemEvent = core.material.items[itemId].useItemEvent;
			if (useItemEvent) {
				try {
					core.insertAction(useItemEvent);
				} catch (e) {
					main.log(e);
				}
			}
			core.updateStatusBar();
		} else {
			core.addItem(itemId, itemNum);
		}
	}

	core.control.updateDamage = function (floorId, ctx) {
		floorId = floorId || core.status.floorId;
		if (!floorId || core.status.gameOver || main.mode != 'play') return;
		const onMap = ctx == null;

		// 没有怪物手册
		if (!core.hasItem('book')) return;
		core.status.damage.posX = core.bigmap.posX;
		core.status.damage.posY = core.bigmap.posY;
		if (!onMap) {
			const width = core.floors[floorId].width,
				height = core.floors[floorId].height;
			// 地图过大的缩略图不绘制显伤
			if (width * height > core.bigmap.threshold) return;
		}
		this._updateDamage_damage(floorId, onMap);
		this._updateDamage_extraDamage(floorId, onMap);
		core.getItemDetail(floorId); // 宝石血瓶详细信息
		//core.drawDoorDetail(floorId); // 门详细信息
		this.drawDamage(ctx);
	};
	// 获取宝石信息 并绘制
	this.getItemDetail = function (floorId) {
		floorId = floorId != null ? floorId : (core.status.thisMap && core.status.thisMap.floorId);
		if (!core.status.thisMap || !core.status.maps[floorId]) return;

		const beforeRatio = core.status.thisMap.ratio;
		core.status.thisMap.ratio = core.status.maps[floorId].ratio;

		const originalHero = core.clone(core.status.hero);
		const blocks = core.status.maps[floorId].blocks;

		blocks.forEach(function (block) {
			var x = block.x,
				y = block.y,
				event = block.event,
				disable = block.disable;
			if (!event || event.cls !== 'items' || ignore.includes(event.id) || disable) return;

			// v2地图优化跳过不可见区域
			if (core.bigmap.v2 &&
				(x < core.bigmap.posX - core.bigmap.extend ||
					x > core.bigmap.posX + core._WIDTH_ + core.bigmap.extend ||
					y < core.bigmap.posY - core.bigmap.extend ||
					y > core.bigmap.posY + core._HEIGHT_ + core.bigmap.extend)) {
				return;
			}

			var itemId = event.id;
			var item = core.material.items[itemId];
			if (!item) return;

			// --- 处理装备类 ---
			if (item.cls === 'equips') {
				var equipValue = (item.equip && item.equip.value) || {};
				var percentage = (item.equip && item.equip.percentage) || {};
				var equipDiff = {};

				for (var key in equipValue) {
					equipDiff[key] = equipValue[key];
				}
				for (var key in percentage) {
					equipDiff[key + 'per'] = percentage[key] + '%';
				}

				drawItemDetail(equipDiff, x, y);
				return;
			}

			// --- 处理普通道具 ---
			var heroClone = core.clone(originalHero);
			var diff = {};

			var handler = {
				set: function (target, key, val) {
					var oldVal = target[key] || 0;
					var delta = val - oldVal;
					if (delta !== 0) {
						if (diff[key] == null) diff[key] = 0;
						diff[key] += delta;
					}
					target[key] = val;
					return true;
				}
			};

			var proxyHero = new Proxy(heroClone, handler);
			core.status.hero = proxyHero;

			try {
				core.setFlag('__statistics__', true);
				core.getItemEffect(item.id, 1);
			} catch (e) {
				console.warn("物品效果执行失败：" + itemId, e);
			}

			drawItemDetail(diff, x, y);
		});

		core.status.hero = originalHero;
		core.status.thisMap.ratio = beforeRatio;
		window.hero = originalHero;
		window.flags = originalHero.flags;
	};

	// 绘制
	function drawItemDetail(diff, x, y) {
		const px = 32 * x + 2,
			py = 32 * y + 30;
		let content = '';
		// 获得数据和颜色
		let i = 0;
		for (const name in diff) {
			if (!diff[name]) continue;
			let color = '#fff';

			if (typeof diff[name] === 'number')
				content = core.formatBigNumber(diff[name], true);
			else content = diff[name];
			switch (name) {
			case 'atk':
			case 'atkper':
				color = '#FF7A7A';
				break;
			case 'def':
			case 'defper':
				color = '#00E6F1';
				break;
			case 'mdef':
			case 'mdefper':
				color = '#6EFF83';
				break;
			case 'hp':
				color = '#A4FF00';
				break;
			case 'hpmax':
			case 'hpmaxper':
				color = '#F9FF00';
				break;
			case 'mana':
				color = '#c66';
				break;
			}
			// 绘制
			core.status.damage.data.push({
				text: content,
				px: px,
				py: py - 10 * i,
				color: color
			});
			i++;
		}
	}


}
}