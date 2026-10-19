/* English layer for the 24-floor Magic Tower (ckcz123/mota-js 2.10.3), written for the mt-thesis site.
   play/index.html loads it after main.js and calls window.mtEnglish() once the game has loaded: the game data (items,
   monsters, floors, shops, special abilities) is translated in place, the text-drawing functions translate what
   they draw, and a new game starts on MT0 without the title screen, the opening and the mode choice (express mode). */
(function () {
  "use strict";
  var CJK = /[\u3400-\u9fff\uff01-\uff5e\u3000-\u303f\u201c\u201d]/;
  var HAN = /[\u3400-\u9fff]/;

  // ---- speakers in "\t[name,icon]" dialogue prefixes ----
  var NAMES = {
    "勇士": "Hero", "仙子": "Fairy", "老人": "Old Man", "商人": "Merchant", "杰克": "Jack", "公主": "Princess",
    "红衣魔王": "Red Demon King", "冥灵魔王": "Nether Demon King", "冥灵魔王：": "Nether Demon King", "作者": "Author",
    "金币商店": "Gold Shop", "经验老人": "EXP Elder", "购入钥匙": "Key Seller", "祭坛": "Altar", "圣光徽": "Holy Light Badge",
    "星光神锒": "Starlight Hammer", "幸运十字架": "Lucky Cross", "风之罗盘": "Wind Compass", "得到神秘宝物！": "Mysterious treasure obtained!",
    "魔塔样板": "Magic Tower template", "24层魔塔": "24-Floor Magic Tower", "此前的复刻": "Earlier remakes", "您所游玩的版本": "This version",
    "24层结局": "24-floor ending", "21层结局": "21-floor ending", "系统提示": "System", "存档笔记": "Save notes", "交易统计": "Trade statistics",
    "说明": "Notes", "键盘快捷键列表": "Keyboard shortcuts", "鼠标操作": "Mouse", "操作成功": "Done", "接续播放录像": "Continue replay",
    "步骤1": "Step 1", "步骤2": "Step 2", "播放存档剩余录像": "Play the rest of a replay", "调试模式开启": "Debug mode on",
    "16层红衣魔王": "MT16 Red Demon King", "勇士：": "Hero"
  };

  // ---- whole texts (dialogue bodies, shop texts, menus); keys are the original strings without their prefixes ----
  var EXACT = {
    // MT0: the fairy
    "……": "...",
    "你醒了！": "You're awake!",
    "……\n你是谁，我在哪里？": "...\nWho are you? Where am I?",
    "我是这里的仙子，刚才你被这里的小怪打昏了。": "I am the fairy of this place. The little monsters here knocked you out.",
    "……\n剑，剑，我的剑呢？": "...\nMy sword... where is my sword?",
    "你的剑被他们抢走了，我只来得及将你救出来。": "They took your sword. I only had time to get you out.",
    "那，公主呢？我是来救公主的。": "And the princess? I came to rescue the princess.",
    "公主还在里面，你这样进去是打不过里面的小怪的。": "The princess is still inside. Going in like this, you cannot beat the monsters there.",
    "那我怎么办，我答应了国王一定要把公主救出来的。": "What can I do? I promised the king I would bring the princess back.",
    "那我现在应该怎么办呢？": "So what should I do now?",
    "放心吧，我把我的力量借给你，你就可以打赢那些小怪了。": "Don't worry. I will lend you my power, and then you can beat those monsters.",
    "不过，你得先帮我去找一样东西，找到了再来这里找我。": "But first you must find something for me. Come back here when you have it.",
    "找东西？找什么东西？": "Find something? Find what?",
    "是一个十字架，中间有一颗红色的宝石。": "A cross with a red gem in the middle.",
    "那个东西有什么用吗？": "What is it for?",
    "我本是这座塔的守护者，可不久前，从北方来了一批恶魔，": "I was the guardian of this tower, but not long ago a horde of demons came from the north,",
    "他们占领了这座塔，并将我的魔力封在了这个十字架里面，": "took the tower and sealed my magic inside that cross.",
    "如果你能将它带出塔来，那我的魔力便会慢慢地恢复，": "If you bring it out of the tower, my magic will slowly return,",
    "到那时我便可以把力量借给你去救出公主了。": "and then I can lend you the power to rescue the princess.",
    "要记住：只有用我的魔力才可以打开二十一层的门。": "Remember: only my magic can open the door on the 21st floor.",
    "……\n好吧，我试试看。": "...\nAll right, I'll try.",
    "刚才我去看过了，你的剑被放在三楼，你的盾在五楼上，": "I just went to look: your sword is on the 3rd floor and your shield on the 5th,",
    "而那个十字架被放在七楼。要到七楼，你得先取回你的剑和盾。": "and the cross is on the 7th floor. To reach the 7th floor, you must first get back your sword and shield.",
    "另外，在塔里的其他楼层上，还有一些存放了好几百年的宝剑和宝物，": "On other floors of the tower there are also swords and treasures kept for hundreds of years;",
    "如果得到它们，对于你对付这里面的怪物将有很大的帮助。": "if you find them, they will help you greatly against the monsters here.",
    "……\n可是，我怎么进去呢？": "...\nBut how do I get in?",
    "我这里有三把钥匙，你先拿去，在塔里面还有很多这样的钥匙，": "Here are three keys. Take them; there are many more keys like these in the tower,",
    "你一定要珍惜使用。勇敢地去吧，勇士！": "so use them wisely. Go bravely, hero!",
    "嗯？！你手里的那个东西是什么？": "Hm?! What is that in your hand?",
    "这个？这是一个老人交给我的，是他叫我带它来找你的。": "This? An old man gave it to me and told me to bring it to you.",
    "他说你知道它的来历和作用。": "He said you would know where it comes from and what it does.",
    "这个东西是仙界的圣物\n名叫“灵之杖”，": "This is a sacred relic of the fairy realm,\ncalled a \"Spirit Staff\".",
    "是很久以前的一个圣者留下的。它们一共有三个，": "A saint left them long ago. There are three of them,",
    "分别镶着红、绿、蓝三种颜色的宝石。": "set with a red, a green and a blue gem.",
    "你现在拿着的是镶有一颗蓝宝石的“冰之灵杖”": "The one you hold, with a blue gem, is the \"Ice Staff\";",
    "应该还有一个镶有绿宝石的“心之灵杖”": "there should also be the \"Heart Staff\" with a green gem",
    "和镶有红宝石的“炎之灵杖”。": "and the \"Flame Staff\" with a red gem.",
    "在这座塔的下面，封印着一只魔界的世兽，名叫“血影”，": "Beneath this tower a beast of the demon world is sealed, called the \"Blood Shadow\",",
    "这三把“灵之杖”就是封印的钥匙。": "and the three Spirit Staffs are the keys to its seal.",
    "封印钥匙？": "Keys to the seal?",
    "每一个“灵之杖”里面\n都有着很强的魔法力量，": "Each Spirit Staff\nholds great magical power;",
    "如果被恶魔得到了将会使它的力量倍增。": "if a demon got one, its power would multiply.",
    "如果被恶魔将它们三个找齐的话，": "If the demons gathered all three,",
    "那么“血影”的封印便会解除！": "the seal of the Blood Shadow would break!",
    "勇士，你还是快去把我要的东西找来吧，等我恢复了魔力，": "Hero, go and find what I asked for. Once my magic returns,",
    "我就可以帮你将“灵之杖”中的魔力都开放出来！": "I can release all the power of the Spirit Staffs for you!",
    "仙子，我已经将那个十字架找到了。": "Fairy, I have found the cross.",
    "你做得很好。\n那么，现在我就开始授与你更强的力量！": "Well done.\nNow I will give you greater power!",
    "咪啦哆咪哗……": "Mi-la-do-mi-hua...",
    "好了，我已经将你现在的能力提升了！": "There. I have raised your abilities!",
    "记住：如果你没有足够的实力的话，不要去第二十一层！": "Remember: unless you are strong enough, do not go to the 21st floor!",
    "在那一层里，你所有宝物的法力都会失去作用！": "On that floor, all your treasures lose their power!",
    "快走吧，杀死魔王后，来第二十二层上找我！": "Go now, and after you kill the Demon King, find me on the 22nd floor!",
    "勇敢地去吧，勇士！": "Go bravely, hero!",
    // item notes on MT1, MT7, MT9, MT12
    "该宝物可以查看怪物的基本情况。使用时按下键盘上的X键即可查看。": "This treasure shows the basic facts of every monster. Press X to open it.",
    "把它交给第四层的小偷，小偷便会用它打开第十八层的隐藏地面（你就可以救出公主了）。": "Give it to the thief on the 4th floor: he will use it to open the hidden floor on the 18th floor (and you can rescue the princess).",
    "把它交给序章中的仙子，可以将自身的所有能力提升三分之一（攻击、防御和生命值）。": "Give it to the fairy of the prologue to raise all your attributes by a third (ATK, DEF and HP).",
    "该宝物可以随意在已经走过的楼层间自由上下。主角可使用G键在已经走过的楼层间进行跳跃。": "With this treasure you can move freely between floors you have visited. Press G to jump between them.",
    // MT2: the old man and the merchant
    "您已经得救了！": "You're free now!",
    "哦，我的孩子，真是太感谢你了！": "Oh, my child, thank you so much!",
    "这个地方又脏又坏，我真的是快呆不下去了。": "This place is filthy and awful; I couldn't have stood it much longer.",
    "快走吧，我还得救走被关在这里的公主。": "Go quickly. I still have to rescue the princess held here.",
    "哦，你是来救公主的，为了表示对你的感谢，": "Oh, you've come to rescue the princess. To thank you,",
    "这个东西就送给你吧，这还是我年青的时候用过的。": "take this. I used it when I was young.",
    "拿着它去解救公主吧！": "Take it and go save the princess!",
    "哦，是嘛！真是太感谢你了！": "Oh, really? Thank you so much!",
    "我是个商人，不知为什么被抓到这里来了。": "I'm a merchant; I have no idea why they brought me here.",
    "快走吧，现在您已经自由了。": "Go quickly, you're free now.",
    "哦，对对对，我已经自由了。": "Oh, right, right, I'm free.",
    "那这个东西就给你吧，本来我是准备卖钱的。": "Then take this; I was going to sell it.",
    "相信它对你一定很有帮助！": "I'm sure it will help you a lot!",
    // MT4: Jack the thief
    "哈，快看，我找到了什么！": "Ha, look what I found!",
    "太好了，这个东西果然是在这里。": "Great, so it really was here.",
    "好吧，我这就去帮你修好第十八层的路面。": "All right, I'll go and repair the floor of the 18th floor for you.",
    "如果你找到那个铁锒头的话，还是来这里找我！": "If you find that iron hammer, come and find me here!",
    "你已经得救了！": "You're free now!",
    "啊，那真是太好了，我又可以在这里面寻宝了！": "Ah, wonderful! Now I can go treasure hunting in here again!",
    "哦，还没有自我介绍，我叫杰克，是这附近有名的小偷，": "Oh, I haven't introduced myself. I'm Jack, a thief well known around here.",
    "什么金银财宝我样样都偷过。不过这次运气可不是太好，": "I've stolen every kind of treasure there is. But this time my luck ran out:",
    "刚进来就被抓了。现在你帮我打开了门，那我就帮你做一件事吧。": "I was caught as soon as I got in. You opened the door for me, so I'll do something for you.",
    "快走吧，外面还有很多怪物，我可能顾不上你。": "Go quickly. There are many monsters out there and I may not be able to look after you.",
    "不，不，不会有事的。\n快说吧，叫我做什么？": "No, no, I'll be fine.\nSo tell me, what should I do?",
    "……\n你会开门吗？": "...\nCan you open doors?",
    "那当然。": "Of course.",
    "那就请你帮我打开第二层的门吧！": "Then please open the door on the 2nd floor for me!",
    "那个简单，不过，如果你能帮我找到一把嵌了红宝石的铁锒头的话，": "That's easy. And if you can find me an iron hammer set with a ruby,",
    "我还帮你打通第十八层的路。": "I'll also open the way on the 18th floor for you.",
    "嵌了红宝石的铁锒头？\n好吧，我帮你找找。": "An iron hammer set with a ruby?\nAll right, I'll look for it.",
    "非常地感谢。一会我便会将第二层的门打开。": "Thank you very much. I'll open the door on the 2nd floor shortly.",
    // MT15: the old man and the merchant
    "你好，勇敢的孩子，你终于来到这里了。": "Hello, brave child. You have finally come.",
    "我将给你一个非常好的宝物，它可以使你的攻击力提升120点，": "I will give you a very fine treasure that raises your attack by 120,",
    "但这必须用你的500点经验来进行交换，考虑一下子吧！": "but it costs 500 of your experience points. Think it over!",
    "这，可我现在还没有那么多的经验。": "But I don't have that much experience yet.",
    "那等你的经验够了而且想要的时候再来吧！": "Then come back when you have enough experience and want it!",
    "好吧，那就将那把剑给我吧！": "All right, give me that sword!",
    "那好吧，这把剑就给你了！": "Very well, the sword is yours!",
    "啊哈，欢迎你的到来！\n我这里有一件对你来说非常好的宝物，": "Aha, welcome!\nI have a treasure that would be very good for you,",
    "只要你出的起钱，我就卖给你。": "and I'll sell it to you if you can pay.",
    "什么宝物？要多少钱？": "What treasure? How much?",
    "是这个游戏里最好的盾牌，防御值可以增加120点，": "The best shield in this game: it adds 120 defence,",
    "而你只要出500个金币就可以买下。怎么样？你有500个金币吗？": "and it's yours for just 500 gold. Well? Do you have 500 gold?",
    "这，可我现在还没有那么多的金币。": "But I don't have that much gold yet.",
    "那等你的金币够了而且想要的时候再来吧！": "Then come back when you have enough gold and want it!",
    "我有500个金币。": "I have 500 gold.",
    "好，成交！": "Good, it's a deal!",
    // MT16: the Red Demon King and the old man
    "停止吧，愚蠢的人类！": "Stop, foolish human!",
    "该停止的是你！魔王。快说，公主关在哪里？": "You're the one who should stop, Demon King! Tell me where the princess is held!",
    "等你打赢我再说吧！": "Beat me first, then we'll talk!",
    "年青人，你终于来了！": "Young man, you've finally come!",
    "您怎么了？": "What's wrong?",
    "我已经快封不住它了，请你将这个东西交给彩蝶仙子，": "I can barely hold the seal any longer. Please give this to the Butterfly Fairy;",
    "她会告诉你这是什么东西，有什么用的！": "she will tell you what it is and what it is for!",
    "快去吧，再迟就来不及了！": "Hurry, or it will be too late!",
    // MT18: the princess
    "请一定要杀死大魔王！": "Please, you must kill the great Demon King!",
    "公主！你得救了！": "Princess! You're saved!",
    "啊，你是来救我的吗？": "Oh, have you come to rescue me?",
    "是的，我是奉国王的命令来救你的。": "Yes, the king sent me to rescue you.",
    "请你快随我出去吧！": "Please come out with me quickly!",
    "不，我还不想走。": "No, I don't want to leave yet.",
    "为什么，这里面到处都是恶魔。": "Why? This place is full of demons.",
    "正是因为这里面到处都是恶魔，所以才不可以就这样出去，": "It's because this place is full of demons that I can't just leave like this.",
    "我要看着那个恶魔被杀死！": "I want to see that demon killed!",
    "英雄的勇士，如果你能够将那个大恶魔杀死，": "Heroic warrior, if you can kill that great demon,",
    "我就和你一起出去！": "I'll leave with you!",
    "大恶魔？我已经杀死了一个魔王！": "Great demon? I've already killed a Demon King!",
    "大恶魔在这座塔的最顶层，你杀死的可能是一个小队长之类的恶魔": "The great demon is at the top of this tower. The one you killed was probably some petty captain.",
    "好，那你等着，等我杀了那个恶魔再来这里找你！": "Fine, wait here. I'll come back for you once I've killed that demon!",
    "大恶魔比你刚才杀死的那个厉害多了。": "The great demon is far stronger than the one you just killed.",
    "而且他还会变身，变身后的魔王他的攻击力": "And he can transform; once transformed, the Demon King's attack",
    "和防御力都会提升至少一半以上，你得小心！": "and defence rise by at least half. Be careful!",
    // MT19 and MT21: the Nether Demon King
    "大魔头，你的死期到了！": "Arch-demon, your time has come!",
    "哈哈哈……\n你也真是有意思，": "Hahaha...\nYou really are amusing.",
    "别以为蝶仙那家伙给了你力量你就可以打败我，": "Don't think you can beat me just because that butterfly fairy gave you power.",
    "想打败我你还早着呢！": "You're nowhere near strong enough to beat me!",
    "废话少说，去死吧！": "Enough talk. Die!",
    "看不出你还有两下子，有本领的话来21楼。": "Not bad, I didn't expect that. If you've got what it takes, come to the 21st floor.",
    "在那里，你就可以见识到我真正的实力了！": "There you will see my true power!",
    "啊……\n怎么可能，我怎么可能会被你打败呢！": "Argh...\nImpossible! How could I be beaten by you!",
    "不，不要这样…………": "No, no, not like this...",
    "看剧情？": "Watch the ending?",
    "大魔头被杀死了,公主也被救出了塔,蝶仙的精力也恢复了\n当勇士和公主一起走出塔来的时候，\n国王也带着军队来到了岛外。一切都是那么地平常。\n回国后，国王为勇士和公主举行了隆重而且盛大的婚礼，\n并且宣布由勇士继承国王的位置。\n从此以后，勇士和公主就幸福地生活在一起了":
      "The arch-demon was dead, the princess was out of the tower, and the butterfly fairy's strength had returned.\nAs the hero and the princess walked out of the tower together,\nthe king arrived at the island with his army. All was calm again.\nBack home, the king held a grand wedding for the hero and the princess\nand named the hero heir to the throne.\nAnd from then on, the hero and the princess lived happily together.",
    "回味经典（不计榜）": "Classic replay (not ranked)",
    "要继续前进吗？": "Do you want to go on?", "继续": "Continue", "放弃": "Give up", "娱乐模式": "Fun mode",
    "选择要提交的榜单！": "Choose a leaderboard to submit to!",
    // MT22: the fairy
    "做得很好。现在你已经将那个可恶的冥灵魔王给杀了，": "Well done. You have killed that wicked Nether Demon King.",
    "快去找另外的两个“灵杖”吧，找齐了以后再来找我！": "Now find the other two Spirit Staffs, and come back when you have them all!",
    "要记住，如果我不把封印解开的话，最底层的怪物你是杀不了的！": "Remember: unless I break the seal, you cannot kill the monster at the very bottom!",
    "快看，我全部都找到了，我找齐所有了！": "Look, I found them all, every one!",
    "嗯，不错，现在我们可以接触这里面的封印了！": "Good. Now we can undo the seal inside them!",
    "那就让我们开始吧！\n神之“灵杖”呀，": "Then let us begin!\nO divine Spirit Staffs,",
    "放射出你们的魔力吧！\n哈哩咪哆唏咪啦~~~~~~~~~": "release your magic!\nHa-li-mi-do-xi-mi-la~~~~~~~~~",
    "……\n（又来了！）": "...\n(Here we go again!)",
    "……\n好了，我已经将它们三个“灵之杖”的魔力都开放出来了！": "...\nThere. I have released the magic of all three Spirit Staffs!",
    "公主就由我来救出去，你快去最底层杀了那个大魔头吧！": "I will take the princess out. You go to the bottom floor and kill that arch-demon!",
    "要记住，如果没有万分的把握，一定不要去开最后那扇花形门！": "Remember: unless you are absolutely sure, do not open the last flower-shaped door!",
    "一旦进去了，你将不能再回来！": "Once you go in, you cannot come back!",
    // shops
    "想要增加你的能力吗？\n如果你有25个金币，你可以任意选择一项：": "Want to raise your abilities?\nFor 25 gold you may choose one:",
    "想要增加你的能力吗？\n如果你有100个金币，\n你可以任意选择一项：": "Want to raise your abilities?\nFor 100 gold\nyou may choose one:",
    "想要增加你的能力吗？\n如果你有100个金币，你可以任意选择一项：": "Want to raise your abilities?\nFor 100 gold you may choose one:",
    "生命+800": "HP +800", "攻击+4": "ATK +4", "防御+4": "DEF +4",
    "增加4000点生命": "HP +4000", "增加20点攻击": "ATK +20", "增加20点防御": "DEF +20",
    "生命+4000": "HP +4000", "攻击+20": "ATK +20", "防御+20": "DEF +20", "获得道具": "Get an item",
    "你的金币不足100枚，无法供奉！": "You have less than 100 gold and cannot make an offering!",
    "你好，英雄的人类，只要你有足够的经验，我就可以让你变得更强大：": "Hello, heroic human. If you have enough experience, I can make you stronger:",
    "提升一级（100）": "One level up (100 EXP)", "增加攻击5（30）": "ATK +5 (30 EXP)", "增加防御5（30）": "DEF +5 (30 EXP)",
    "提升三级（270）": "Three levels up (270 EXP)", "增加攻击17（95）": "ATK +17 (95 EXP)", "增加防御17（95）": "DEF +17 (95 EXP)",
    "相信你一定有特殊的需要，只要你有金币，我就可以帮你：": "You surely have special needs. If you have gold, I can help:",
    "购买1把黄钥匙（10）": "Buy 1 yellow key (10 gold)", "购买1把蓝钥匙（50）": "Buy 1 blue key (50 gold)", "购买1把红钥匙（100）": "Buy 1 red key (100 gold)",
    "哦，欢迎你的到来，如果你手里缺少金币，我可以帮你：": "Oh, welcome! If you are short of gold, I can help:",
    "卖出一把黄钥匙（7）": "Sell 1 yellow key (7 gold)", "卖出一把蓝钥匙（35）": "Sell 1 blue key (35 gold)", "卖出一把红钥匙（70）": "Sell 1 red key (70 gold)",
    "你没有黄钥匙！": "You have no yellow key!", "你没有蓝钥匙！": "You have no blue key!", "你没有红钥匙！": "You have no red key!",
    "三楼商店": "3F shop", "11楼商店": "11F shop", "五楼老人": "5F elder", "13楼老人": "13F elder", "出售钥匙": "Sell keys", "恭喜升级": "Level up!",
    "离开": "Leave", "商店": "Shop", "购买": "Buy", "存货": "Stock", "数量": "Qty", "预计": "Total", "已购次数": "Bought", "已卖次数": "Sold",
    "该商店尚未开启": "This shop is not open yet", "预览模式下不可购买": "Cannot buy in preview mode", "购买条件不足": "Requirements not met",
    "尚未进行过任何交易。": "No trades yet.", "当前无法使用快捷商店！": "The quick shop cannot be used now!",
    // settings menu of this tower (events.js)
    "游戏说明": "Game notes", "暴击与相关机制": "Critical hits and related rules", "结局条件": "Endings", "游戏榜单": "Leaderboards", "怪物增强": "Monster upgrades",
    "自动拾取物品 [不含血瓶]": "Auto-pickup [no potions]", "自动拾取物品 [全部]": "Auto-pickup [all]", "自动拾取已关闭": "Auto-pickup off",
    "已开启：拾取物品(不含血瓶)": "On: pick up items (no potions)", "已切换：拾取全部物品": "Switched: pick up all items",
    "退出设置": "Close settings", "交易统计": "Trade statistics", "移动音效 [on]": "Footstep sound [on]", "移动音效 [off]": "Footstep sound [off]",
    "动画速度": "Animation speed", "减速（+25）": "Slower (+25)", "加速（-25）": "Faster (-25)", "置0": "Set to 0",
    "Flash原版中，勇士有随机暴击（即某一次攻击的伤害结果会变为两倍，原版游戏中会有“一匹脱”的声音发出），概率值为等级/200（最高为1）\n现复刻版中，“经典模式”完全依照原版的战斗过程。“极速模式”则没有暴击机制。":
      "In the original Flash game the hero has random critical hits (one strike does double damage), with probability level/200 (at most 1).\nIn this remake, \"classic mode\" follows the original battles exactly; \"express mode\" has no critical hits.",
    "Flash原版中有仁慈机制，如果勇士的血量小于等于怪物手册里显示的伤害（按无暴击计算），则无法与怪物开战。":
      "The original has a mercy rule: if the hero's HP is at most the damage shown in the monster manual (without critical hits), the fight cannot start.",
    "如果您在拿到十字架前，先去16F找老人拿到神秘宝物，并交给0层的仙子，即可开通22层及以上的隐藏层，击败24层血影后达成24层结局。":
      "If, before taking the cross, you get the mysterious treasure from the old man on 16F and give it to the fairy on floor 0, the hidden floors from 22 up open; defeating the Blood Shadow on floor 24 gives the 24-floor ending.",
    "如果您直接拿取十字架，则16F老人会立即消失，此时击败21层冥灵魔王后达成21层结局。":
      "If you take the cross directly, the old man on 16F disappears at once, and defeating the Nether Demon King on floor 21 gives the 21-floor ending.",
    "本塔的经典模式不计榜单。极速模式下，可选择打出【21层结局】或【24层结局】。上述2种结局下，均设置13个榜单：最高血量、最高攻击、最高攻防和、最高等级、最多金币、最多经验、最多金币商店购买次数、最多经验老人购买次数、最多留存怪物、最低防御、最低攻防和、最少金币商店购买次数、最少经验老人购买次数。因此，全塔共有2*13=26个榜单。":
      "Classic mode is not ranked. In express mode you can aim for the 21-floor or the 24-floor ending; each has 13 leaderboards (highest HP, ATK, ATK+DEF and level; most gold, EXP, gold-shop and EXP-elder purchases and monsters left alive; lowest DEF and ATK+DEF; fewest gold-shop and EXP-elder purchases), 26 in all.",
    "《24层魔塔》是由胖老鼠工作室于2003年发布的Flash游戏（初始版本仅设有21层），2004年推出V1.1版和V1.12版，扩展至24层剧情。24层魔塔作为中国首款魔塔游戏，和50层魔塔、新新魔塔并称为三原塔，对中国早期魔塔的发展产生了深远影响。":
      "24-Floor Magic Tower is a Flash game released by Fat Mouse Studio in 2003 (the first version had 21 floors); versions 1.1 and 1.12 followed in 2004 and extended the story to 24 floors. As China's first Magic Tower game, it is counted with the 50-floor tower and New New Magic Tower among the three original towers and shaped the early Chinese Magic Tower games.",
    "（排名不分先后）\n复刻者：艾之葵、秋橙、北海小羊\n\n在此致谢诸位前辈的探索与积累，为本项目提供了重要参考与传承。":
      "(in no particular order)\nRemade by: 艾之葵, 秋橙, 北海小羊\n\nThanks to everyone whose earlier work this remake builds on.",
    "基于FlashV1.12版本复刻。\n复刻者：详见本塔置顶评论。\n\n感谢所有参与其中的玩家与测试者，是你们让本塔不断完善。":
      "A remake of Flash version 1.12.\nRemade by: see the pinned comment of this tower.\n\nThanks to all players and testers who helped improve it.",
    // system menus and messages (libs/ui.js, control.js, events.js, actions.js, items.js)
    "确定": "OK", "取消": "Cancel", "是": "Yes", "否": "No", "音效设置": "Sound", "显示设置": "Display", "操作设置": "Controls", "返回主菜单": "Back to menu",
    "返回上一级": "Back", "系统设置": "System settings", "虚拟键盘": "Virtual keyboard", "浏览地图": "View maps", "存档笔记": "Save notes", "同步存档": "Sync saves",
    "游戏信息": "Game info", "返回标题": "Title screen", "返回游戏": "Back to game", "新增存档笔记": "Add a note", "查看存档笔记": "View notes",
    "编辑存档笔记": "Edit a note", "删除存档笔记": "Delete notes", "返回上一页": "Back", "同步存档到服务器": "Upload saves", "从服务器加载存档": "Download saves",
    "存档至本地文件": "Save to a file", "从本地文件读档": "Load from a file", "回放和下载录像": "Replays", "清空本地存档": "Clear local saves",
    "同步本地所有存档": "Sync all local saves", "只同步当前单存档": "Sync this save only", "返回上级菜单": "Back", "下载所有存档": "Download all saves",
    "只下载当前单存档": "Download this save", "清空全部塔的存档": "Clear saves of all towers", "只清空当前塔的存档": "Clear saves of this tower",
    "从头回放录像": "Replay from the start", "从存档开始回放": "Replay from a save", "接续播放剩余录像": "Continue a replay", "播放存档剩余录像": "Play the rest of a replay",
    "选择录像文件": "Choose a replay file", "下载当前录像": "Download this replay", "数据统计": "Statistics", "查看工程": "View project", "游戏主页": "Game page",
    "操作帮助": "Help", "关于游戏": "About", "下载离线版本": "Download offline version", "上一页": "Previous page", "下一页": "Next page",
    "本层无怪物": "No monsters on this floor", "多属性...": "More...", "临界": "Crit", "减伤": "Save", "加防": "+DEF", "无法战斗": "Cannot fight",
    "该怪物无特殊属性。": "This monster has no special ability.", "楼层跳跃": "Floor jump", "浏览地图时也": "Even while viewing maps,", "可楼层跳跃！": "you can jump floors!",
    "上移地图 [W]": "Map up [W]", "下移地图 [S]": "Map down [S]", "前张地图 [▲ / PGUP]": "Previous map [▲ / PGUP]", "后张地图 [▼ / PGDN]": "Next map [▼ / PGDN]",
    "退出 [ESC / ENTER]": "Exit [ESC / ENTER]", "消耗道具": "Consumables", "永久道具": "Permanent items", "[装备栏]": "[Equipment]", "[道具栏]": "[Items]",
    "未知道具": "Unknown item", "该道具暂无描述。": "No description.", "该道具暂无描述": "No description", "<继续点击该道具即可进行使用>": "<Click the item again to use it>",
    "当前装备": "Equipped", "拥有装备": "Owned", "未知部位": "Unknown slot", "该装备暂无描述。": "No description.",
    "<当前没有该装备的空位，请先卸下装备>": "<No free slot; take something off first>", "删除模式": "Delete mode", "[E]显示收藏": "[E] Favourites",
    "[E]显示全部": "[E] All", "空": "Empty", "存档": "Save", "读档": "Load", "回放": "Replay", "自动存档": "Autosave", "全塔": "Tower", "当前": "Current",
    "存档成功！": "Saved!", "读档成功": "Loaded", "不能覆盖自动存档！": "Cannot overwrite the autosave!", "当前禁止存档": "Saving is disabled here",
    "请等待当前事件的处理结束": "Wait until the current event has finished", "无效的存档": "Invalid save", "存档版本不匹配": "Save version mismatch",
    "你打不过此怪物！": "You cannot beat this monster!", "无法开启此门": "This door cannot be opened", "请先停止勇士行动": "Stop moving first",
    "无法传送到当前层": "Cannot teleport to this floor", "只有在楼梯边才能使用": "Only usable next to stairs", "本游戏没有快捷商店！": "This game has no quick shop!",
    "当前无法打开快捷商店！": "The quick shop cannot be opened now!", "当前不能使用": "Cannot be used now", "无法选择此项": "This option is not available",
    "当前项尚未开启": "Not available yet", "你确定要返回标题页面吗？": "Return to the title screen?", "你想读取自动存档么？": "Load the autosave?",
    "恭喜通关": "Congratulations, you cleared the tower!", "录像回放完毕！": "Replay finished!", "你想记录你的ID和成绩吗？": "Record your ID and score?",
    "你想下载录像吗？": "Download the replay?", "已进入预览模式，可直接拖动大地图": "Preview mode: drag the map", "成功换上": "Equipped", "已卸下": "Taken off",
    "游戏帮助": "Help", "游戏失败": "Game over", "战斗动画": "Battle animation", "回合间隔": "Round interval",
    "你的血量不够无暴击计算的预期伤害，无法开战！": "Your HP is below the expected damage; the fight cannot start!",
    "名称": "Name", "等级": "Level", "生命上限": "Max HP", "生命": "HP", "魔力上限": "Max MP", "魔力": "MP", "攻击": "ATK", "防御": "DEF", "护盾": "MDEF",
    "金币": "Gold", "经验": "EXP", "加点": "Points", "步数": "Steps", "伤害": "Damage", "生命值": "HP", "攻击力": "ATK", "防御力": "DEF", "无": "none",
    "怪物首先攻击": "Strikes first", "得到 大飞羽 等级提升三级 ！": "Got the Big Feather: three levels up!", "请稍候...": "Please wait...",
    "正在加载楼层文件...": "Loading floors...", "正在加载核心js文件...": "Loading the game..."
  };

  // ---- parameterised texts ----
  var TEMPLATES = [
    [/^第 ?(\d+) ?层$/, function (m) { return "Floor " + m[1]; }],
    [/^魔塔 ?第 ?(\d+) ?层$/, function (m) { return "Floor " + m[1]; }],
    [/^序 ?章$/, function () { return "Prologue"; }],
    [/^地 ?下 ?层$/, function () { return "Basement"; }],
    [/^获得 ?([\s\S]+)$/, function (m) { return "Got " + tr(m[1]); }],
    [/^得到 ([\s\S]+)$/, function (m) { return "Got " + tr(m[1]); }],
    [/^打败 ([\s\S]+)$/, function (m) { return "Defeated " + tr(m[1]); }],
    [/^得到金币数 (\d+) 经验值 (\d+) ！$/, function (m) { return "Gold +" + m[1] + ", EXP +" + m[2] + "!"; }],
    [/^无法飞往([\s\S]+)！$/, function (m) { return "Cannot fly to " + tr(m[1]) + "!"; }],
    [/^成功卖出(\d+)个([\s\S]+)$/, function (m) { return "Sold " + m[1] + " × " + tr(m[2]); }],
    [/^([\s\S]+)使用成功$/, function (m) { return tr(m[1]) + " used"; }],
    [/^当前无法使用([\s\S]+)$/, function (m) { return "Cannot use " + tr(m[1]) + " now"; }],
    [/^你的([\s\S]+)不足！$/, function (m) { return "Not enough: " + tr(m[1]) + "!"; }],
    [/^你没有([\s\S]+)$/, function (m) { return "You have no " + tr(m[1]); }],
    [/^当前回合间隔：(-?\d+)$/, function (m) { return "Round interval: " + m[1]; }],
    [/^(\d+)连击$/, function (m) { return m[1] + "× Strike"; }],
    [/^怪物每回合攻击(\d+)次$/, function (m) { return "Strikes " + m[1] + " times per round"; }],
    [/^21层结局（([\s\S]*)）$/, function (m) { return "21-floor ending (" + m[1] + ")"; }],
    [/^24层结局（([\s\S]*)）$/, function (m) { return "24-floor ending (" + m[1] + ")"; }]
  ];

  // ---- word list for whatever the tables above miss (longest first); punctuation is converted afterwards ----
  var GLOSS = [
    ["黄钥匙", "yellow key"], ["蓝钥匙", "blue key"], ["红钥匙", "red key"], ["绿钥匙", "green key"], ["钥匙", "key"],
    ["生命上限", "max HP"], ["生命值", "HP"], ["生命", "HP"], ["攻击力", "ATK"], ["攻击", "ATK"], ["防御力", "DEF"], ["防御", "DEF"],
    ["护盾", "MDEF"], ["魔防", "MDEF"], ["金币", "gold"], ["经验值", "EXP"], ["经验", "EXP"], ["等级", "level"], ["回合", "rounds"],
    ["怪物手册", "monster manual"], ["怪物", "monster"], ["伤害", "damage"], ["楼层", "floor"], ["存档", "save"], ["读档", "load"],
    ["录像", "replay"], ["商店", "shop"], ["购买", "buy"], ["卖出", "sell"], ["离开", "leave"], ["确定", "OK"], ["取消", "cancel"],
    ["返回", "back"], ["当前", "current"], ["无法", "cannot"], ["成功", "done"], ["失败", "failed"], ["道具", "item"], ["装备", "equipment"],
    ["勇士", "hero"], ["仙子", "fairy"], ["公主", "princess"], ["魔王", "demon king"], ["十字架", "cross"], ["宝物", "treasure"],
    ["宝石", "gem"], ["血瓶", "potion"], ["剑", "sword"], ["盾", "shield"], ["门", "door"], ["层", " floor"], ["版本", "version"],
    ["作者", "author"], ["设置", "settings"], ["显示", "show"], ["开启", "on"], ["关闭", "off"], ["请输入", "enter"], ["提示", "tip"],
    ["战斗", "fight"], ["暴击", "critical hit"], ["领域", "zone"], ["夹击", "pincer"], ["中毒", "poison"], ["衰弱", "weak"], ["诅咒", "curse"],
    ["毒", "Psn"], ["衰", "Weak"], ["咒", "Curse"], ["破", "Pick "], ["炸", "Bomb "], ["飞", "Fly "],
    ["点", " pts"], ["次", "×"], ["个", ""], ["把", ""], ["的", " "]
  ];
  var PUNCT = [["，", ", "], ["。", ". "], ["！", "!"], ["？", "?"], ["：", ": "], ["；", "; "], ["（", " ("], ["）", ")"], ["【", "["], ["】", "]"],
               ["“", "\""], ["”", "\""], ["、", ", "], ["……", "..."], ["…", "..."], ["　", " "]];
  // single characters drawn on their own (the status bar's level suffix and the like)
  var SINGLE = { "级": "Lv", "层": "F", "破": "Pick", "炸": "Bomb", "飞": "Fly", "毒": "Psn", "衰": "Weak", "咒": "Curse" };

  // ---- game data ----
  var ITEMS = {
    yellowKey: ["Yellow Key", "Opens one yellow door"], blueKey: ["Blue Key", "Opens one blue door"], redKey: ["Red Key", "Opens one red door"],
    greenKey: ["Green Key", "Opens one green door"], steelKey: ["Iron Door Key", "Opens one iron door"],
    redGem: ["Red Gem", "ATK +3", ", ATK +3"], blueGem: ["Blue Gem", "DEF +3", ", DEF +3"],
    greenGem: ["Green Gem", "MDEF +${core.values.greenGem}", ", MDEF +${core.values.greenGem * core.status.thisMap.ratio}"],
    yellowGem: ["Yellow Gem", "Points to distribute", ", all attributes up"],
    redPotion: ["Red Potion", "HP +200", ", HP +200"], bluePotion: ["Blue Potion", "HP +500", ", HP +500"],
    yellowPotion: ["Yellow Potion", "HP +${core.values.yellowPotion}", ", HP +${core.values.yellowPotion * core.status.thisMap.ratio}"],
    greenPotion: ["Green Potion", "HP +${core.values.greenPotion}", ", HP +${core.values.greenPotion * core.status.thisMap.ratio}"],
    sword0: ["Broken Sword", "A rusty sword", ", ATK +0"], sword1: ["Iron Sword", "An ordinary iron sword", ", ATK +10!"],
    sword2: ["Steel Sword", "An ordinary steel sword", ", ATK +70!"], sword3: ["Azure Blade", "An ordinary azure blade", ", ATK +70!"],
    sword4: ["Holy Light Sword", "A holy light sword", ", ATK +120!"], sword5: ["Starlight Sword", "A divine starlight sword", ", ATK +150!"],
    shield0: ["Broken Shield", "A battered iron shield", ", DEF +0"], shield1: ["Iron Shield", "An ordinary iron shield", ", DEF +10!"],
    shield2: ["Steel Shield", "An ordinary steel shield", ", DEF +30!"], shield3: ["Gold Shield", "An ordinary gold shield", ", DEF +85!"],
    shield4: ["Starlight Shield", "A starlight shield", ", DEF +120!"], shield5: ["Radiant Shield", "A divine radiant shield", ", DEF +190!"],
    superPotion: ["Holy Water", "Doubles HP", ", HP doubled"],
    book: ["Holy Light Badge", "Shows the basic facts of every monster. Press X to open it."],
    fly: ["Wind Compass", "Move freely between floors you have visited. Press G to jump between them."],
    coin: ["Lucky Coin", "Defeated monsters give double gold while you hold it"], freezeBadge: ["Freeze Badge", "Turns the lava in front of you into floor"],
    cross: ["Lucky Cross", "Give it to the fairy of the prologue to raise all your attributes by a third (ATK, DEF and HP)."],
    dagger: ["Dragon-Slaying Dagger", "Not defined yet"], amulet: ["Amulet", "Ignore harmful terrain while you hold it"],
    bigKey: ["Key Box", "Opens every yellow door on this floor", ", one more key of each colour!"],
    pickaxe: ["Pickaxe", "Breaks the wall in front of you"], icePickaxe: ["Gem Hammer", "The thief's hammer"],
    bomb: ["Bomb", "Destroys the monster in front of you"], centerFly: ["Small Feather", null, ": one level up!"],
    upFly: ["Up Wing", "Fly to the same position on the floor above"], downFly: ["Down Wing", "Fly to the same position on the floor below"],
    earthquake: ["Earthquake Scroll", "Breaks every wall on this floor"], poisonWine: ["Antidote", "Cures poison"],
    weakWine: ["Tonic", "Cures weakness"], curseWine: ["Holy Draught", "Lifts curses"], superWine: ["Panacea", "Cures every ailment"],
    hammer: ["Holy Hammer", "Not defined yet"], lifeWand: ["Life Wand", "Restores 100 HP"], jumpShoes: ["Jump Boots", "Jump two tiles ahead"],
    skill1: ["Flame Staff"], wand: ["Heart Staff"], pack: ["Gold Nugget", null, ", gold +300!"], I338: ["Big Feather", null, ": three levels up!"]
  };
  var ENEMIES = {
    greenSlime: "Green Slime", redSlime: "Red Slime", blackSlime: "Black Slime", slimelord: "Slime Lord", bat: "Bat", bigBat: "Big Bat",
    redBat: "Red Bat", vampire: "Nether Demon King", vampire2: "Nether Demon King", vampire3: "Nether Demon King", skeleton: "Skeleton",
    skeletonSoilder: "Skeleton Soldier", skeletonCaptain: "Skeleton Captain", ghostSkeleton: "Nether Captain", zombie: "Beast-Man",
    zombieKnight: "Beast Warrior", rock: "Rock Man", slimeMan: "Shadow Warrior", bluePriest: "Junior Mage", redPriest: "Senior Mage",
    brownWizard: "Hemp-Robe Mage", redWizard: "Red-Robe Mage", yellowGuard: "Junior Guard", blueGuard: "Mid Guard", redGuard: "Senior Guard",
    swordsman: "Two-Hand Swordsman", soldier: "Nether Warrior", yellowKnight: "Gold Sentinel", redKnight: "Gold Captain",
    darkKnight: "Spirit Warrior", blackKing: "Black Demon King", yellowKing: "Yellow Demon King", greenKing: "Azure-Robe Warrior",
    blueKnight: "Blue Knight", goldSlime: "Yellow Slime", poisonSkeleton: "Purple Skeleton", poisonBat: "Purple Bat", steelRock: "Iron-Mask Man",
    skeletonPriest: "Skeleton Mage", skeletonKing: "Skeleton King", skeletonWizard: "Skeleton Wizard", redSkeletonCaption: "Skeleton Warrior",
    badHero: "Lost Hero", demon: "Demon Warrior", demonPriest: "Demon Mage", goldHornSlime: "Gold-Horn Slime", redKing: "Red Demon King",
    whiteKing: "White Warrior", blackMagician: "Spirit Mage", silverSlime: "Silver Slime", swordEmperor: "Sword Saint",
    whiteHornSlime: "Spike-Horn Slime", badPrincess: "Witch of Agony", badFairy: "Dark Fairy", grayPriest: "Mid Mage", redSwordsman: "Sword King",
    whiteGhost: "Mercury Warrior", poisonZombie: "Green Beast-Man", magicDragon: "Magic Dragon", octopus: "Blood Shadow", darkFairy: "Fairy",
    greenKnight: "Shield Knight", angel: "Angel", elemental: "Elemental", steelGuard: "Steel Guard", evilBat: "Evil Bat"
  };
  var SPECIALS = {
    1: ["First Strike", "Strikes first"], 2: ["Magic Attack", "Ignores your DEF"], 3: ["Solid", "Its DEF is at least your ATK − 1"],
    4: ["Double Strike", "Strikes twice per round"], 5: ["Triple Strike", "Strikes three times per round"], 10: ["Mimic", "Has your ATK and DEF"],
    12: ["Poison", "After the fight you are poisoned and lose HP with every step"], 13: ["Weaken", "After the fight your ATK and DEF drop for a while"],
    14: ["Curse", "After the fight, fights give you no gold or EXP"], 16: ["Pincer", "Walking between two identical monsters halves your HP"],
    19: ["Self-Destruct", "After the fight your HP becomes 1"], 20: ["Invincible", "Cannot be defeated without the cross"],
    23: ["Rebirth", "Reappears when you change floors after defeating it"], 26: ["Support", "Neighbouring monsters join the fight"]
  };
  var SPECIAL_NAMES = { 6: "Multi-Strike", 7: "Armour Break", 8: "Counter", 9: "Purify", 11: "Vampire", 15: "Zone", 17: "Hatred", 18: "Repulse",
                        21: "Degrade", 22: "Fixed Damage", 24: "Laser", 25: "Aura", 27: "Capture" };

  var START_TEXT = [
    { type: "setText", title: [255, 255, 255, 1], background: [0, 0, 0, 1] },
    { type: "setValue", name: "item:book", value: "1" },
    { type: "setValue", name: "flag:fly", value: "false" },
    { type: "setValue", name: "flag:移动音效", value: "true" },
    // the "skip the opening" branch of the original: the fairy's three keys, the fairy moved aside
    { type: "function", "function": "function(){\ncore.addItem('yellowKey');\ncore.addItem('blueKey');\ncore.addItem('redKey');\ncore.hideBlock(6, 9, 'MT0');\ncore.setBlock('fairy', 5, 9, 'MT0')\n}" },
    // express mode of the original: no battle animation, the weak floor teleporter
    { type: "setValue", name: "item:fly", value: "1" },
    { type: "setValue", name: "flag:开启暴击", value: "false" }
  ];

  var cache = Object.create(null);
  function punct(s) { for (var i = 0; i < PUNCT.length; i++) s = s.split(PUNCT[i][0]).join(PUNCT[i][1]); return s.replace(/ {2,}/g, " "); }
  function body(s) {
    if (EXACT[s] != null) return EXACT[s];
    for (var i = 0; i < TEMPLATES.length; i++) { var m = s.match(TEMPLATES[i][0]); if (m) return TEMPLATES[i][1](m); }
    if (!HAN.test(s)) return punct(s);
    var t = s;
    for (var j = 0; j < GLOSS.length; j++) if (t.indexOf(GLOSS[j][0]) >= 0) t = t.split(GLOSS[j][0]).join(GLOSS[j][1]);
    return punct(t);
  }
  function tr(s) {
    if (typeof s !== "string" || !CJK.test(s)) return s;
    if (cache[s] != null) return cache[s];
    var out, m = s.match(/^(\t\[([^\]]*)\])?(\u0008\[[^\]]*\]|\\b\[[^\]]*\])?([\s\S]*)$/);
    if (m && (m[1] || m[3])) {
      var head = "";
      if (m[1]) {
        var parts = m[2].split(",");
        parts[0] = NAMES[parts[0]] || (CJK.test(parts[0]) ? body(parts[0]) : parts[0]);
        head = "\t[" + parts.join(",") + "]";
      }
      out = head + (m[3] || "") + (m[4] ? body(m[4]) : "");
    } else out = body(s);
    cache[s] = out;
    return out;
  }
  window.mtTranslate = tr;

  function wrap(obj, name, argIndex) {
    if (!obj || typeof obj[name] !== "function") return;
    var orig = obj[name];
    obj[name] = function () {
      var a = Array.prototype.slice.call(arguments);
      if (typeof a[argIndex] === "string") a[argIndex] = tr(a[argIndex]);
      return orig.apply(this, a);
    };
  }

  function patchData() {
    // the tables are copied into core.material when a game starts, so the sources are translated as well
    [core.material.items, core.items && core.items.items].forEach(function (items) {
      if (!items) return;
      for (var id in ITEMS) {
        if (!items[id]) continue;
        var e = ITEMS[id];
        items[id].name = e[0];
        if (e[1] != null) items[id].text = e[1];
        if (e[2] != null) items[id].itemEffectTip = e[2];
      }
      for (var k in items) if (items[k] && HAN.test(items[k].name || "")) items[k].name = items[k].name === "新物品" ? "New item" : tr(items[k].name);
    });
    [core.material.enemys, core.enemys && core.enemys.enemys].forEach(function (en) {
      for (var id in en || {}) if (en[id]) en[id].name = ENEMIES[id] || tr(en[id].name);
    });
    [core.floors, core.initStatus && core.initStatus.maps].forEach(function (set) {
      for (var fid in set || {}) {
        var f = set[fid];
        if (!f) continue;
        if (typeof f.title === "string") f.title = tr(f.title);
        if (typeof f.name === "string" && HAN.test(f.name)) f.name = tr(f.name);
      }
    });
    core.firstData.title = "24-Floor Magic Tower";
    if (core.firstData.hero) core.firstData.hero.name = "Hero";
    if (core.status && core.status.hero) core.status.hero.name = "Hero";
  }

  function hook() {
    wrap(core.ui, "drawTip", 0);
    wrap(core.ui, "drawTextBox", 0);
    wrap(core.ui, "drawTextContent", 1);
    wrap(core.ui, "drawScrollText", 0);
    wrap(core.ui, "drawConfirmBox", 0);
    wrap(core.utils, "setStatusBarInnerHTML", 1);
    if (core.plugin) wrap(core.plugin, "showTextPopup", 0);
    var drawChoices = core.ui.drawChoices;
    core.ui.drawChoices = function (content, choices) {
      var a = Array.prototype.slice.call(arguments);
      a[0] = tr(content);
      if (Array.isArray(choices)) a[1] = choices.map(function (c) {
        if (typeof c === "string") return tr(c);
        if (!c || typeof c.text !== "string") return c;
        var copy = {}; for (var k in c) copy[k] = c[k];
        copy.text = tr(c.text);
        return copy;
      });
      return drawChoices.apply(this, a);
    };
    // the game wraps text character by character: break English lines between words instead
    var drawChar = core.ui._drawTextContent_drawChar;
    core.ui._drawTextContent_drawChar = function (tempCtx, content, config, ch) {
      if (config.maxWidth != null) {
        if (ch === " " && config.offsetX === 0 && config.index > 1) return true;
        var start = config.index - ch.length;
        if (config.offsetX > 0 && /[^\s\\]/.test(ch) && content.charAt(start - 1) === " ") {
          var word = /^[^\s\\]+/.exec(content.slice(start));
          if (word) {
            var w = core.calWidth(tempCtx, word[0]) + config.letterSpacing * word[0].length;
            if (config.offsetX + w > config.maxWidth && w <= config.maxWidth) this._drawTextContent_newLine(tempCtx, config);
          }
        }
      }
      return drawChar.call(this, tempCtx, content, config, ch);
    };
    var getSpecials = core.enemys.getSpecials;
    core.enemys.getSpecials = function () {
      return getSpecials.apply(this, arguments).map(function (s) {
        var out = s.slice(), en = SPECIALS[s[0]];
        if (en) { out[1] = en[0]; out[2] = en[1]; }
        else {
          if (SPECIAL_NAMES[s[0]]) out[1] = SPECIAL_NAMES[s[0]];
          if (typeof s[2] === "function") out[2] = function (enemy) { return tr(s[2](enemy)); };
          else out[2] = tr(s[2]);
        }
        if (s[0] === 6) out[1] = function (enemy) { return (enemy.n || 4) + "× Strike"; };
        return out;
      });
    };
    // labels and menus drawn on a canvas in one piece: translated here and shrunk to about the width of the original
    // (dialogue is translated before layout and then drawn character by character, so it never reaches this point in Chinese)
    var P = CanvasRenderingContext2D.prototype, measure = P.measureText;
    // two-character labels sit in fixed columns: keep them within the original width; longer texts may grow a little
    var limitOf = function (ctx, text) { return Math.max(measure.call(ctx, text).width * (text.length <= 2 ? 1 : 1.3), 12); };
    ["fillText", "strokeText"].forEach(function (name) {
      var orig = P[name];
      P[name] = function (text, x, y, maxWidth) {
        if (typeof text === "string" && CJK.test(text) && (text.length > 1 || SINGLE[text])) {
          var t = SINGLE[text] || tr(text);
          if (t !== text) {
            var limit = limitOf(this, text);
            if (maxWidth != null) limit = Math.min(limit, maxWidth);
            var w = measure.call(this, t).width;
            if (w > limit) {
              var font = this.font;
              this.font = font.replace(/(\d+(?:\.\d+)?)px/, function (_m, px) { return Math.max(8, Math.floor(parseFloat(px) * limit / w)) + "px"; });
              var r = orig.call(this, t, x, y);
              this.font = font;
              return r;
            }
            text = t;
          }
        }
        return maxWidth == null ? orig.call(this, text, x, y) : orig.call(this, text, x, y, maxWidth);
      };
    });
    // layout code measures the label it is about to draw: report the width the translated label will have
    P.measureText = function (text) {
      if (typeof text === "string" && CJK.test(text) && (text.length > 1 || SINGLE[text])) {
        var t = SINGLE[text] || tr(text);
        if (t !== text) {
          var m = measure.call(this, t), limit = limitOf(this, text);
          return m.width <= limit ? m : { width: limit };
        }
      }
      return measure.call(this, text);
    };
  }

  function autoStart() {
    core.firstData.startText = START_TEXT;
    main.dom.levelChooseButtons.style.display = "none";
    main.dom.startButtonGroup.style.display = "none";
    core.dom.startPanel.style.display = "none";
    core.events._startGame_start("");
  }

  window.mtEnglish = function () {
    patchData();
    hook();
    document.title = "24-Floor Magic Tower";
    if (core.dom.logoLabel) core.dom.logoLabel.innerText = core.firstData.title;
    // a restart (N, or after a defeat) skips the title screen too
    var show = core.control.showStartAnimate;
    core.control.showStartAnimate = function (noAnimate, callback) {
      return show.call(core.control, true, function () { if (callback) callback(); setTimeout(autoStart, 0); });
    };
    autoStart();
  };
})();
