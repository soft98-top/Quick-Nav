// JavaScript Database Connect
var Jsdbc = {
    /* 
        data:object 用来存放整体的数据
        set:func 用来在浏览器上更新存储数据
        get:func 用来从浏览器上读取存储的数据
        refresh:func 用来同步插件和浏览器的存储数据
    */
    data:{},
    set(object){
        chrome.storage.sync.set(object, function() {
        });
        this.data = object.data;
    },
    get(){
        chrome.storage.sync.get('data', function(result) {
            console.log(result);
            if(result.data === undefined){
                Jsdbc.set({'data':{}});
            }else{
                Jsdbc.data = result.data;
            }
            Nav.init();
        });
    },
    init(){
        this.get();
    }
}
// Nav的相关存储的具体实现
var Nav = {
    data:{},
    keywords:[],
    map:{},
    parseMap(object){
        if(object.map != undefined){
            Object.assign(this.map,object.map);
        }
        this.refresh();
    },
    refresh(){
        this.keywords = Object.keys(this.map);
        this.keywords.sort((a, b) => (b.length === a.length ? 0 : a.length > b.length ? 1 : -1));
        this.data["keywords"] = this.keywords;
        this.data["map"] = this.map;
        Jsdbc.set({'data':this.data});
    },
    init(){
        this.data = Jsdbc.data;
        this.parseMap(this.data);
    }
}
// 规则操作的具体实现
var Operation = {
    add(keyword, url){
        temp = {};
        temp[keyword] = url;
        Nav.parseMap({'map':temp});
    },
    addByJson(object){
        Nav.parseMap({'map':object});
    },
    del(keyword){
        delete Nav.map[keyword];
        Nav.refresh();
    },
    delAll(){
        Nav.map = {};
        Nav.refresh();
    }
}
Jsdbc.init();
// 地址栏输入关键字之后，对于输入的内容做出建议响应
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    // 无内容输入时，不做响应
    if(!text){
        return;
    }
    let keywords = Nav.keywords;
    if(keywords.length == 0){
        suggest([{
            'content':'Tips',
            'description':'Tips: 当前没有添加关键字映射，默认使用百度搜索。'
        }]);
    }else{
        let contents = [];
        for(let i=0; i < keywords.length; i++){
            let temp = {};
            if(text.split(" ")[0] == keywords[i]){
                text = text.replace(keywords[i] + " ","");
                text = text.replace(keywords[i],"");
            }
            temp["content"] = keywords[i] + " " + text;
            temp["description"] = keywords[i] + " " + text;
            contents.push(temp);
        }
        suggest(contents);
    }
});
// 输入内容回车后，对输入内容做处理
chrome.omnibox.onInputEntered.addListener((text) => {
    // 回车无内容，不做处理
    // console.log(text);
    if(!text || text == "Tips"){
        return;
    }
    let keywords = Nav.keywords;
    let url = "";
    if(keywords.length == 0){
        url = "https://www.baidu.com/s?wd={q}";
    }else{
        text = text.trim();
        let keyword = text.split(" ")[0];
        url = Nav.map[keyword];
        if(url == undefined){
            url = "https://www.baidu.com/s?wd={q}";
        }else{
            text = text.replace(keyword + " ","");
        }
    }
    url = url.replace("\{q\}",text);
    chrome.tabs.create({"url":url},function(){
    });
});
// 通过右键菜单来增加关键字映射
chrome.contextMenus.create({
    "type":"normal",
    "title":"Quick-Nav",
    "contexts":["all"],
    "id":"1"
});
chrome.contextMenus.create({
    "type":"normal",
    "title":"自定义添加至关键字映射",
    "contexts":["all"],
    "parentId":"1",
    "onclick":function(){
        let url = prompt("输入网址，将需要填充的位置用{q}代替：");
        if(url != null){
            let keyword = prompt("请输入映射的关键字：");
            if(keyword){
                Operation.add(keyword,url);
            }
        }
    }
});
chrome.contextMenus.create({
    "type":"normal",
    "title":"将当前页添加至关键字映射",
    "contexts":["all"],
    "parentId":"1",
    "onclick":function(params){
        let url = prompt("将需要填充的位置用{q}代替：",params.pageUrl);
        if(url != null){
            let keyword = prompt("请输入映射的关键字：");
            if(keyword){
                Operation.add(keyword,url);
            }
        }
    }
});
chrome.contextMenus.create({
    "type":"normal",
    "title":"通过json字符串添加关键字映射",
    "contexts":["all"],
    "parentId":"1",
    "onclick":function(){
        let jsonStr = prompt('请输入符合格式json字符串{key:url}，例如：{"soft98":"https://www.soft98.top/"}');
        if(jsonStr != null){
            let json = JSON.parse(jsonStr);
            Operation.addByJson(json);
        }
    }
});