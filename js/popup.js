// 调用后台方法
const Bg = {
    bg:chrome.extension.getBackgroundPage(),
    add(keyword,url){
        this.bg.Operation.add(keyword,url);
        Operation.display();
    },
    addByJson(json){
        this.bg.Operation.addByJson(JSON.parse(json));
    },
    del(keyword){
        this.bg.Operation.del(keyword);
    },
    delAll(){
        this.bg.Operation.delAll();
    },
    getKeywords(){
        console.log(this.bg);
        return this.bg.Nav.keywords;
    },
    getMap(){
        return this.bg.Nav.map;
    },
    getData(){
        return this.bg.Nav.data;
    }
}
// popup的显示操作具体实现
const Operation = {
    keywords:[],
    map:{},
    init(){
        this.keywords = Bg.getKeywords();
        this.map = Bg.getMap();
    },
    display(){
        let html = "";
        if(this.keywords.length > 0){
            for(let i = 0; i < this.keywords.length; i++){
                let keyword = this.keywords[i];
                let tmp1 = '<div class="input-group-prepend"><span class="input-group-text" id="xxx">?</span></div>'.replace("?",keyword);
                tmp1 = tmp1.replace("xxx",keyword);
                let tmp2 = '<input type="text" class="form-control" value="?">'.replace("?",this.map[keyword]);
                let tmp3 = '<div class="input-group">?</div>'.replace("?",tmp1 + tmp2);
                html += tmp3;
            }
            $("#display").html(html);
            for(let i = 0; i < this.keywords.length; i++){
                let keyword = this.keywords[i];
                $("#"+keyword).dblclick(function(){
                    Bg.del(keyword);
                    $(this).parent().parent().remove();
                });
            }
        }else{
            html = "<center>当前没有关键字映射</center>";
            $("#display").html(html);
        }
    }
}
$(function(){
    Operation.init();
    Operation.display();
});