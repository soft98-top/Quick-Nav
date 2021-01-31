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
    funcs:{},
    parseMap(object){
        if(object.map != undefined){
            Object.assign(this.map,object.map);
        }
        if(object.funcs != undefined){
            Object.assign(this.funcs,object.funcs);
        }
        this.refresh();
    },
    refresh(){
        this.keywords = Object.keys(this.map);
        this.keywords.sort((a, b) => (b.length === a.length ? 0 : a.length > b.length ? 1 : -1));
        this.data["keywords"] = this.keywords;
        this.data["map"] = this.map;
        this.data["funcs"] = this.funcs;
        Jsdbc.set({'data':this.data});
        for(let i = 0; i < this.keywords.length; i++){
            let keyword = this.keywords[i];
            if(this.funcs[keyword]!=undefined){
                let funcStr = 'Handle.func["xxx"] = function(query){yyy}';
                funcStr = funcStr.replace('xxx',keyword);
                funcStr = funcStr.replace('yyy',this.funcs[keyword]);
                eval(funcStr);
            }else{
                let funcStr = 'Handle.func["xxx"] = null';
                funcStr = funcStr.replace('xxx',keyword);
                eval(funcStr);
            }
        }
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
    addFunc(keyword, func){
        temp = {};
        temp[keyword] = func;
        Nav.parseMap({'funcs':temp});
    },
    addFuncByJson(object){
        Nav.parseMap({'funcs':object});
    },
    del(keyword){
        delete Nav.map[keyword];
        delete Nav.funcs[keyword];
        Nav.refresh();
    },
    delAll(){
        Nav.map = {};
        Nav.refresh();
    },
    delFunc(keyword){
        delete Nav.funcs[keyword];
        Nav.refresh();
    },
    delAllFunc(){
        Nav.funcs = {};
        Nav.refresh();
    }
}
// 用来存放各个关键字的处理函数，并通过Handle进行调用
var Handle = {
    func:{},
    search(text){
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
                if(Handle.func[keyword]!=null){
                    let funcStr = 'Handle.func.??("query")';
                    funcStr = funcStr.replace("??",keyword);
                    funcStr = funcStr.replace("query",text);
                    text = eval(funcStr);
                }
            }
        }
        url = url.replace("\{q\}",text);
        chrome.tabs.create({"url":url},function(){
        });
    },
    add(){
        let url = prompt("输入网址，将需要填充的位置用{q}代替：");
        if(url != null){
            let keyword = prompt("请输入映射的关键字：");
            if(keyword){
                Operation.add(keyword,url);
                let code = prompt("请输入自定义处理语句（选填）,输入的字符串变量名为query,默认为原样填充。")
                if(code){
                    Operation.addFunc(keyword,code);
                }
            }
        }
    },
    addByParams(params){
        let url = prompt("将需要填充的位置用{q}代替：",params.pageUrl);
        if(url != null){
            let keyword = prompt("请输入映射的关键字：");
            if(keyword){
                Operation.add(keyword,url);
                let code = prompt("请输入自定义处理语句（选填）,输入的字符串变量名为query,默认为原样填充。")
                if(code){
                    Operation.addFunc(keyword,code);
                }
            }
        }
    },
    addByJson(){
        let jsonStr = prompt('请输入符合格式json字符串{key:url}，例如：{"soft98":"https://www.soft98.top/"}');
        if(jsonStr != null){
            let json = JSON.parse(jsonStr);
            Operation.addByJson(json);
        }
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
    Handle.search(text);
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
        Handle.add();
    }
});
chrome.contextMenus.create({
    "type":"normal",
    "title":"将当前页添加至关键字映射",
    "contexts":["all"],
    "parentId":"1",
    "onclick":function(params){
        Handle.addByParams(params);
    }
});
chrome.contextMenus.create({
    "type":"normal",
    "title":"通过json字符串添加关键字映射",
    "contexts":["all"],
    "parentId":"1",
    "onclick":function(){
        
    }
});
// 按键监听
chrome.commands.onCommand.addListener(function(command) {
    if(command === "command-popup-search" || command === "command-popup-search-global"){
        let text = prompt("根据格式进行输入，默认使用百度搜索。");
        Handle.search(text);
    }
    if(command === "command-popup-add"){
        Handle.add();
    }
    if(command === "command-popup-addByJson"){
        Handle.addByJson();
    }
});