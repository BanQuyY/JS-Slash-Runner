function g(i){
	return document.getElementById(i);
}
function q(i){
	return document.querySelectorAll(i);
}
function checkOverflow(el,stl)
{
	stl = stl || getComputedStyle(el)
    var curOverflow = stl.overflow;
    if(curOverflow == "auto" || curOverflow=="hidden" ){
   		return false;
    }
    return el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
}
function containFloatAndAbsolute(el){
	for(var i=0;i<el.children.length;i++){
		var stl = getComputedStyle(el.children[i]);
		if( stl.display=="absolute")return true;
	}
	return false;
}
function isIgnore(el){
	if(el.id=="surf-menubar" || el.id=="mainbar"){
		return true;
	}
	return false;
}
function textScaling(basetext,newtext){

}
function showBtn(){
	var btn=document.createElement("button");
	btn.setAttribute("style","display:block;position:fixed;bottom:20%;right:5px; width:40px;height:40px;background-color:#eaeaea80;border-radius:50%;font-size:12px;text-align:center;z-index:99999999;");
	btn.innerHTML = "Dịch";
	btn.onclick = function(){
		realtimeTranslate(true,true);
	}
	document.body.appendChild(btn);
}
var setting = {
	enable:true,
	heightauto:true,
	widthauto:false,
	scaleauto:true,
	enableajax:false,
	enablescript:true,
	strictarial:false,
	stvserver: "comic.sangtacvietcdn.xyz/tsm.php?cdn="
}
var namedata = "";
var namedatacache = null;
function replaceName(text){
	var t = text;
	if(namedatacache){
		for(var i=0;i<namedatacache.length;i++){
			t = t.replace(namedatacache[i][0], namedatacache[i][1]);
		}
		return t;
	}
	namedatacache = [];
	var n = namedata.split("\n");
	for(var i=0;i<n.length;i++){
		var m = n[i].trim().split("=");
		if(m[0] && m[1]){
			var r = new RegExp(m[0],"g");
			namedatacache.push([r,m[1]]);
			t = t.replace(r, m[1]);
		}
	}
	return t;
}
chrome.storage.sync.get([
		"enable",
		"heightauto",
		"widthauto",
		"scaleauto",
		"enableajax",
		"enablescript",
		"strictarial",
		"delaytrans",
		"delaymutation",
		"server",
		"showbtn",
		"namedata",
		"excludes"
	], function(result) {
  	for(var settingName in result){
  		if(result[settingName] == "false"){
  			setting[settingName] = false;
  		}else{
  			setting[settingName] = true;
  		}
  		if(settingName == "delaytrans"){
  			translateDelay = parseInt(result[settingName]);
  		}
  		if(settingName == "delaymutation"){
  			deferDelay = parseInt(result[settingName]);
  		}
  		if(settingName == "server"){
  			setting.stvserver = result[settingName];
  		}
  		if(settingName == "showbtn"){
  			if(result[settingName] == "true"){
  				showBtn();
  			}
  		}
		if(settingName == "namedata"){
			namedata = result[settingName];
		}
		if(settingName == "excludes"){
			if(setting.enable){
				var pageDomain = location.hostname;
				var excludes = result[settingName].split("\n").map(function(e){return e.trim();}).filter(function(e){return e.length>0;});
				if(excludes.indexOf(pageDomain) >= 0){
					setting.enable = false;
					console.log("Page excluded from auto translation: " + pageDomain);
				}
			}
		}
  	}
  	
  	startScript();
});
function insertClearfix(node){
	var clearfix = document.createElement("div");
	clearfix.setAttribute("calculated", "true");
	clearfix.setAttribute("style", "clear:both");
	node.appendChild(clearfix);
}
function countChild(node) {
	var c=node.children.length;
	for(var i=0;i<node.children.length;i++){
		c += countChild(node.children[i]);
	}
	return c;
}

function removeOverflow(){
	if(setting.heightauto || setting.widthauto)
	q("div:not([calculated]), nav, main:not([calculated]), section:not([calculated])").forEach(function(e){
		e.setAttribute("calculated", "true");
		var stl = getComputedStyle(e);
		if(checkOverflow(e,stl) 
			&& !isIgnore(e)){
			if(setting.heightauto){
				if(stl.maxHeight == 'none'){
					e.style.maxHeight = (parseInt(stl.height) * 2)+"px";
				}
				if(parseInt(stl.height) + "px" == stl.height)
					e.style.minHeight=stl.height;
				if(stl.overflowY == 'auto' || stl.overflowY == 'scroll'){
					
				}else{
					e.style.height="auto";
				}
				
			}
			if(setting.widthauto){
				if(parseInt(stl.width) + "px" == stl.width)
					e.style.minWidth=stl.width;
				e.style.width="auto";
			}
		}
		if(e.tagName=="NAV"){
			e.style.fontSize = (parseInt(stl.fontSize) * 0.75) + "px";
			e.style.overflow = 'hidden';
		}
	});
	if(setting.heightauto || setting.widthauto)
	q("ul").forEach(function(e){
		if(checkOverflow(e) 
			&& !isIgnore(e)){
			var stl = getComputedStyle(e);
			if(setting.heightauto){
				if(parseInt(stl.height) + "px" == stl.height)
					e.style.minHeight=stl.height;
				e.style.height="auto";
			}
			if(setting.widthauto||stl.position == 'absolute'){
				if(parseInt(stl.width) + "px" == stl.width)
					e.style.minWidth=stl.width;
				e.style.width="auto";
			}
		}
		e=e.parentElement;
		if(e&&checkOverflow(e) 
			&& !isIgnore(e)){
			var stl = getComputedStyle(e);
			if(setting.heightauto){
				if(parseInt(stl.height) + "px" == stl.height)
					e.style.minHeight=stl.height;
				if(stl.overflowY == 'auto' || stl.overflowY == 'scroll'){
					
				}else{
					e.style.height="auto";
				}
			}
			if(stl.position == 'absolute'||setting.widthauto){
				if(parseInt(stl.width) + "px" == stl.width)
					e.style.minWidth=stl.width;
				e.style.width="auto";
			}
		}
	});
	if(setting.scaleauto)
	q("pp:not([calculated]),a:not([calculated]),label:not([calculated]),"+
		"button:not([calculated]), [type=\"submit\"]:not([calculated]),"+
		"li:not([calculated]), span:not([calculated]), i:not([calculated]),"+
		"h3:not([calculated]),h2:not([calculated]),h1:not([calculated]),h4:not([calculated])").forEach(function(e){
		e.setAttribute("calculated", "true");
		if(e.tagName=="A"){
			if(!(e.className.match(/btn|click|button/i))){
				if(e.children.length>1){
					return;
				}
			}
		}
		if(e.tagName=="LABEL"){
			if(e.children.length>1){
				return;
			}
		}
		if(e.tagName=="LI"){
			if(countChild(e)<3){
				e.style.whiteSpace = 'nowrap';
			}
			e.style.wordBreak = 'keep-all';
		}
		if(checkOverflow(e) 
			&& !isIgnore(e)){
			var stl = getComputedStyle(e);
			var fontsize = parseInt(stl.fontSize) ;
			var pd = parseInt(stl.paddingLeft) ;

			var multiply =1;
			var multiply2 =1;
			
			if(fontsize > 26){
				multiply = 5;
			}else
			if(fontsize > 22){
				multiply = 3;
			}else
			if(fontsize >= 16){
				multiply = 2;
			}else
			if(fontsize > 14){
				multiply = 2;
			}else
			if(fontsize > 12){
				multiply = 1;
			}
			if(fontsize - multiply < 10){
				e.style.fontSize="10px";
			}else
			e.style.fontSize=(fontsize- multiply) +"px";
			

			if(pd > 30){
				multiply2 = 20;
			}else
			if(pd > 20){
				multiply2 = 16;
			}else
			if(pd > 10){
				multiply2 = 7;
			}else
			if(pd > 5){
				multiply2 = 3;
			}

			if(fontsize - multiply < 10){
				e.style.fontSize="10px";
			}else
			e.style.fontSize=(fontsize - multiply) +"px";
			if(pd>0){
				if(pd - multiply2 < 0){
					e.style.paddingLeft="0px";
					e.style.paddingRight="0px";
				}else{
					e.style.paddingRight=(pd - multiply2) +"px";
					e.style.paddingLeft=(pd - multiply2) +"px";
				}	
			}
			if(checkOverflow(e)){
				if(fontsize - multiply*2 < 10){
					e.style.fontSize="10px";
					e.style.textOverflow = 'ellipsis';
				}else
				e.style.fontSize = (fontsize -  multiply*2) + "px";
				//e.clientHeight;
				if(checkOverflow(e)){
					if(fontsize - multiply*3< 10){
						e.style.fontSize="10px";
						e.style.textOverflow = 'ellipsis';
					}else
					e.style.fontSize = (fontsize -  multiply*3) + "px";
					//e.clientHeight;
					if(checkOverflow(e)){
						if(fontsize - multiply*5< 10){
							e.style.fontSize="10px";
							e.style.textOverflow = 'ellipsis';
						}else
						e.style.fontSize = (fontsize -  multiply*5) + "px";
					}
				}
			}
		}
	});
}

var realtimeTranslateLock = false;
var chineseRegex = /[\u3400-\u9FBF]/;
function recurTraver(node,arr,tarr){
	if(!node)return;
	for(var i=0;i<node.childNodes.length;i++){
		if(node.childNodes[i].nodeType == 3){
			if(chineseRegex.test(node.childNodes[i].textContent)){
				arr.push( node.childNodes[i] );
				tarr.push( node.childNodes[i].textContent );
			}
		}else{
			if(node.childNodes[i].tagName!="SCRIPT")
			recurTraver(node.childNodes[i],arr,tarr);
		}
	}
	if(node.shadowRoot){
		monitorShadowRootMutation(node.shadowRoot);
		recurTraver(node.shadowRoot, arr, tarr);
	}
}
function translatePlaceholder(arr,tarr){
	var listNode = q("input[type=\"submit\"], [placeholder], [title]");
	for(var i=0;i<listNode.length;i++){
		var flag=false;
		var nodeid=0;
		if(listNode[i].type=="submit" && listNode[i].value.match(/[\u3400-\u9FBF]/)){
			if(!flag){
				flag=true;
				arr.push(listNode[i]);
				nodeid=arr.length-1;
			}
			tarr.push(nodeid+"<obj>btnval<obj>"+listNode[i].value);
		}
		if(listNode[i].placeholder && listNode[i].placeholder.match(/[\u3400-\u9FBF]/)){
			if(!flag){
				flag=true;
				arr.push(listNode[i]);
				nodeid=arr.length-1;
			}
			tarr.push(nodeid+"<obj>plchd<obj>"+listNode[i].placeholder);
		}
		if(listNode[i].title && listNode[i].title.match(/[\u3400-\u9FBF]/)){
			if(!flag){
				flag=true;
				arr.push(listNode[i]);
				nodeid=arr.length-1;
			}
			tarr.push(nodeid+"<obj>title<obj>"+listNode[i].title);
		}
	}
}
var isChinese = document.title.match(/[\u3400-\u9FBF]/);
var oldSend = XMLHttpRequest.prototype.send;
var translateDelay = 120;
var deferDelay = 200;
var enableRemoveOverflow=true;
if(setting.heightauto == false && setting.widthauto==false && setting.scaleauto==false){
	enableRemoveOverflow=false;
}
function poporgn(){
	var t = "";
	for(var i=0;i<this.childNodes.length;i++){
		if(this.childNodes[i].nodeType==3){
			t+=this.childNodes[i].orgn||"";
		}
	}
	this.setAttribute("title", t);
}
async function isJK(text){
	var pm = await new Promise(function(rs,rj){
		console.log(text);
		chrome.i18n.detectLanguage(text,rs);
	});
	console.log(pm.languages);
	return pm.languages[0].language == "ja";
}
async function realtimeTranslate(defered,btn){
	if(!btn)
	if(realtimeTranslateLock || !setting.enable){
		return;
	}
	//console.log(setting);
	realtimeTranslateLock = true;
	setTimeout(function(){
		realtimeTranslateLock = false;
	}, translateDelay);
	if(isChinese){
		attachAjaxRoot();
	}
	//console.log('Checking for realtimeTranslate');
	var totranslist =[];
	var transtext =[];
	var currnode = document.body;
	recurTraver(q("title")[0],totranslist,transtext);
	recurTraver(currnode,totranslist,transtext);
	if(totranslist.length > 0){
		var transtext2 = transtext.join("=|==|=");
		var isjk = await isJK(transtext2);
		if(isjk && !defered){
			console.log("defer");
			setTimeout(function(){
				console.log("defered");
				realtimeTranslate(true);
			},2000);
			return;
		}
		if(!isChinese){
			var newlen = transtext2.replace(/[\u3400-\u9FBF]+/g,"").length;
			if(transtext2.length - newlen > 200){
				isChinese=true;
			}
		}
		var ajax = new XMLHttpRequest();
		ajax.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var translateds = this.responseText.split("=|==|=");
				for(var i=0;i<totranslist.length;i++){
					totranslist[i].textContent = translateds[i];
					totranslist[i].orgn = transtext[i];
					if(totranslist[i].parentElement && !totranslist[i].parentElement.popable){
						totranslist[i].parentElement.addEventListener("mouseenter", poporgn);
						totranslist[i].parentElement.popable = true;
					}
				}
				if(isChinese){
					if(enableRemoveOverflow)
						removeOverflow();
					invokeOnChinesePage();
				}
			}
		};
		ajax.open("POST", "//"+setting.stvserver+"/", true);
		ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		oldSend.apply(ajax,[ "sajax=trans&content="+encodeURIComponent( replaceName(transtext2) ) ]);
	}
	var totranslist2 =[];
	var transtext3 =[];
	translatePlaceholder( totranslist2,transtext3 );	
	if(totranslist2.length > 0){
		var transtext4 = transtext3.join("=|==|=");
		var ajax2 = new XMLHttpRequest();
		ajax2.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var translateds = this.responseText.split("=|==|=");
				for(var i=0;i<translateds.length;i++){
					var obj=translateds[i].split("<obj>");
					if(obj[1]=="title"){
						totranslist2[obj[0]].title = obj[2];
					}else
					if(obj[1]=="btnval"){
						totranslist2[obj[0]].value = obj[2];
					}else
					if(obj[1]=="plchd"){
						totranslist2[obj[0]].placeholder = obj[2];
					}
				}
			}
		};
		ajax2.open("POST", "//"+setting.stvserver+"/", true);
		ajax2.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		oldSend.apply(ajax2,[ "sajax=trans&content="+encodeURIComponent( replaceName(transtext4) ) ]);
	}
}


function attachAjax(){
	var oldSend2 = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(){
	 	this.onloadend=function(){
			if(this.responseText.length>10){
				document.dispatchEvent(new CustomEvent('CallTranslator',{}));
			}
		}
		oldSend2.apply(this, arguments);
	}
}
function attachAjaxRoot(fun){
	if(!setting.enableajax)return;
	var script = document.createElement('script');
	script.textContent = attachAjax.toString()+"attachAjax()";
	(document.head||document.documentElement).appendChild(script);
	script.remove();
	document.addEventListener('CallTranslator', function () {
	  	setTimeout(realtimeTranslate, 0);
	});

	attachAjaxRoot=function(){};
}	
function runOnMainContext(s){
	var script = document.createElement('script');
	script.textContent = s;
	(document.head||document.documentElement).appendChild(script);
	script.remove();
}

function monitorShadowRootMutation(shadowRoot) {
	if(shadowRoot.attachedMutationObserver){
		return;
	}
	if(isChinese && setting.enablescript){
		var MutationLock = false;
		var DeferedCheck = false;
		const observer = new MutationObserver(function(mutationsList) {
			if(MutationLock){
				if(!DeferedCheck){
					DeferedCheck=true;
				}
				return;
			}
			setTimeout(function() {
				MutationLock = false;
				if(DeferedCheck){
					DeferedCheck=false;
					realtimeTranslate();
				}
			}, deferDelay);
			realtimeTranslate();
		});
		observer.observe(shadowRoot, { childList: true, subtree: true, characterData: true } );
		shadowRoot.attachedMutationObserver = true;
	}
}

function invokeOnChinesePage(){
	if(isChinese && setting.enablescript){
		var MutationLock = false;
		var DeferedCheck = false;
		const observer = new MutationObserver(function(mutationsList){
			if(MutationLock){
				if(!DeferedCheck){
					DeferedCheck=true;
				}
				return;
			}
			setTimeout(function(){
				MutationLock = false;
				if(DeferedCheck){
					DeferedCheck=false;
					realtimeTranslate();
				}
			}, deferDelay);
			realtimeTranslate();
		});
		observer.observe(document.body, { childList: true, subtree: true, characterData: true } );
	}
	if(isChinese){
		var css = document.createElement("style");
		if(setting.strictarial){
			css.textContent=":not(i){font-family: arial !important;word-break:break-word;text-overflow:ellipsis;}";
		}
			css.textContent=":not(i){font-family: arial;word-break:break-word;text-overflow:ellipsis;}";
		document.head.appendChild(css);
	}

	window.invokeOnChinesePage=function() {}
}
function startScript(){
	if(!setting.enable){
		return;
	}
	setTimeout(realtimeTranslate, 500);
	//realtimeTranslate();
}
startScript();

var hostname;
var path;
var hostpath;
var hash;
var protocol;
var file;
var stv="//trans.sangtacviet.com/";
var step=0;
function readVar(){
	var url = decodeURIComponent(location.search.split("=")[1]);
	if(url.substring(0, 5)=="https"||url.substring(0,4)=="http"){
		var urlpart=url.split("/")
		protocol=urlpart[0]+"//";
		hostname=urlpart[2];
		urlpart.shift();
		urlpart.shift();
		urlpart.shift();
		file=urlpart.pop();
		path="/"+urlpart.join("/");
		hostpath=hostname+path;
	}
}

function lnk(a){
	if(step==0)
	return stv+encodeURIComponent(a);
	else {
		return a;
	}
}
function pureUrl(url){
	step=0;
	return makeUrl(url)
}
function makeUrl(url){
	if(url==null)return "";
	if(url.match(/^https?:\/\//)){
		if(url.indexOf("sangtacviet.com/")>0)return url;
		return lnk(url);
	}else
	if(url.substring(0,2)=="//")
	{
		if(url.indexOf("sangtacviet.com/")>0)return url;
		return lnk(protocol+url.substring(2));
	}else
	if(url.charAt(0)=="/"){
		return lnk(protocol+hostname+url);
	}else
	if(url.match(/^(javascript:|mailto:)/)||url.charAt(0)=="#")
	{
		return url;
	}else
	{
		return lnk(protocol+hostname+path+"/"+url);
	}
}
function attachAnchor(node) {
	if(location.search=="")return;
	step=0;
	var multab=getCookie("allowmultitab");
	if(node){
		node.querySelectorAll('a').forEach(function(e) {
			var newurl=makeUrl(e.getAttribute("href"));
			e.setAttribute("href", newurl);
			if(!multab){
				e.setAttribute("target", "_self");
			}
		});
	}else
	q(':not([id="mainbar"]) a').forEach(function(e) {
		var newurl=makeUrl(e.getAttribute("href"));
		e.setAttribute("href", newurl);
		if(!multab){
			e.setAttribute("target", "_self");
		}
	});
}
function attachImage() {
	step=1;
	q(':not([id="mainbar"]) img').forEach(function(e) {
		var newurl=makeUrl(e.getAttribute("src"));
		e.setAttribute("onerror", "");
		e.setAttribute("src", newurl);
	});
}
function attachForm(){
	step=0;
	q(':not([id="mainbar"]) form').forEach(function(e) {
		var newurl=makeUrl(e.getAttribute("action"));
		if(gbk!=null && gbk==true){
			var elem = document.createElement("input");
			elem.setAttribute("type", "hidden");
			elem.setAttribute("name", "stv_gbk");
			elem.setAttribute("value", "true");
			e.appendChild(elem);
		}
		e.setAttribute("baseorigin", e.getAttribute("action"));
		e.setAttribute("action", newurl);
		if(e.method && e.method.toLowerCase() =="get"){
			var oldsubmit = function(){};
			if(e.onsubmit){
				oldsubmit = e.onsubmit;
			}
			e.onsubmit = function(){
				event.preventDefault();
				var qrstring = $(this).serialize();
				var baseorigin = this.getAttribute("baseorigin");
				if(baseorigin.indexOf("?") < 0){
					baseorigin+="?";
				}
				baseorigin+=qrstring;
				step=0;
				baseorigin = makeUrl(baseorigin);
				if(this.target=="_blank"){
					window.open(baseorigin);
				}else{
					location = baseorigin;
				}
			}
		}
	});
}
function attachCss(){
	step=1;
	q('link[rel="stylesheet"]').forEach(function(e) {
		if(!e.getAttribute("href")){
			return;
		}
		var newurl=makeUrl(e.getAttribute("href"));
		e.setAttribute("href", newurl);
	});
}
function attachIframe(){
	step=1;
	q('iframe').forEach(function(e) {
		if(e.id=="navigatebar"){

		}else{
			var newurl=makeUrl(e.getAttribute("src"));
			e.setAttribute("src", newurl);
		}
	});
}
function attachSelect(){
	step=1;
	q('select').forEach(function(e) {
		if(e.getAttribute("onchange")!=null){
			if(e.getAttribute("onchange").match(/location(?:\.href)? *= *.*?/)){
				e.setAttribute("onchange", e.getAttribute("onchange").replace(/location(?:\.href)? *= *([^ ;]+);?/,function(match,p1){
					return "location=pureUrl("+p1.trim(';')+")";
				}));
			}
		}
	});
}
function attachOnclick(){
	step=1;
	q('[onclick]').forEach(function(e) {
		if(e.getAttribute("onclick")!=null){
			if(e.getAttribute("onclick").match(/location(?:\.href)? *= *.*?/)){
				e.setAttribute("onclick", e.getAttribute("onclick").replace(/location(?:\.href)? *= *([^ ;]+)(;)?/g,function(match,p1,p2){
					return "location=pureUrl("+p1.trim(';')+")"+(p2||"");
				}));
			}
		}
	});
}
function attachAll(){
	if(location.search=="")return;
	readVar();
	attachAnchor();
	attachImage();
	attachForm();
	attachCss();
	attachIframe();
	attachOnclick();
	attachSelect();
	if(detectContent()){
		if(window.loadStvConfig){
			if(!window.$){
				q("[surc]")[0].src="/jqr.js";
			}
		}
	}
}
function stripScripts(s) {
    var div = document.createElement('div');
    div.innerHTML = s;
    var scripts = div.getElementsByTagName('script');
    var i = scripts.length;
    while (i--) {
      scripts[i].parentNode.removeChild(scripts[i]);
    }
    return div.innerText;
}
function detectContent(){
	var dlist = document.querySelectorAll("div[class], div[id]");
	var ranking ={};
	var rankingarr = [];
	var dupli = {};
	for(var i=0;i<dlist.length;i++){
		var identity = "div" + (dlist[i].hasAttribute("class")?"."+dlist[i].getAttribute("class").replace(/ +/g, "."):"") + 
			(dlist[i].hasAttribute("id")?"#"+dlist[i].getAttribute("id"):"");
		if(identity in dupli){
			continue;
		}
		if(identity in ranking){
			delete ranking[identity];
			dupli[identity] = true;
		}else{
			var htmllen = dlist[i].innerHTML.replace(/>[^<]*?</g,"><").replace(/<i h=[^>]+><\/i>/g,"").length;
			var textlen = stripScripts(dlist[i].innerHTML).length;
			if(textlen > 7000 && textlen - htmllen > 5000){
				ranking[identity] = true;
				rankingarr.push({
					identity: identity,
					element: dlist[i]
				});
			}
		}
	}
	var contentdiv=false;
	for(var i=rankingarr.length - 1;i>=0 && !contentdiv;i--){
		if(rankingarr[i].identity in ranking){
			contentdiv=rankingarr[i].element;
		}
	}
	console.log(contentdiv);
	if(contentdiv){
		contentdiv.setAttribute("id", "maincontent");
		return true;
	}else{
		try {
			g("bigmaincontent").setAttribute("id", "maincontent");
		} catch(e) {
			console.log(e);
		}
		return false;
	}
}
var clickedEl;
document.addEventListener("contextmenu", function(event){
    clickedEl = event.target;
}, false);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request == "copySelected") {
        
        var t = "";
		for(var i=0;i<clickedEl.childNodes.length;i++){
			if(clickedEl.childNodes[i].nodeType==3){
				t+=clickedEl.childNodes[i].orgn||"";
			}
		}
		sendResponse({value: t});
	}
	if(request == "copyName") {
        
        var t = "";
		var v = "";
		for(var i=0;i<clickedEl.childNodes.length;i++){
			if(clickedEl.childNodes[i].nodeType==3){
				t+=clickedEl.childNodes[i].orgn||"";
				v+=clickedEl.childNodes[i].textContent||"";
			}
		}
		sendResponse({chi: t,vi: v});
	}
	if(request && request.type == "translateImage"){
		if(request.imageUrl){
			createMangaReaderOverlay([request.imageUrl]);
		}
		sendResponse({status: "ok"});
	}
});

function detectComicImage(){
	var eles = q(`
		[style*="background-image"],
		[style*="background"],
		[style*="src"],
		img[src],
		img[srcset],
		img[data-src],
		img[data-srcset],
		canvas,
	`);
	var detectedElementType = null;
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	var accumulatedArea = 0;
	var accumulatedAreaThreshold = 0.5 * windowWidth * windowHeight;
	for (var i = 0; i < eles.length; i++) {
		var el = eles[i];
		var stl = getComputedStyle(el);
		if (stl.display == "none" || stl.visibility == "hidden") {
			continue;
		}
		if (el.tagName == "IMG" && el.src) {
			if (el.naturalWidth > windowWidth * 0.5 && el.naturalHeight > windowHeight * 0.5) {
				detectedElementType = "img";
				break;
			}
		} else if (stl.backgroundImage && stl.backgroundImage != "none") {
			var bgImageUrl = stl.backgroundImage.slice(4, -1).replace(/"/g, "");
			if (bgImageUrl) {
				detectedElementType = "background";
				break;
			}
		} else if (stl.background && stl.background != "none") {
			var bgUrl = stl.background.slice(4, -1).replace(/"/g, "");
			if (bgUrl) {
				detectedElementType = "background";
				break;
			}
		} else if (stl.src && stl.src != "none") {
			var srcUrl = stl.src.slice(4, -1).replace(/"/g, "");
			if (srcUrl) {
				detectedElementType = "src";
				break;
			}
		} else if (stl.srcset && stl.srcset != "none") {
			var srcsetUrl = stl.srcset.slice(4, -1).replace(/"/g, "");
			if (srcsetUrl) {
				detectedElementType = "srcset";
				break;
			}
		}
		else if (stl["data-src"] && stl["data-src"] != "none") {
			var dataSrcUrl = stl["data-src"].slice(4, -1).replace(/"/g, "");
			if (dataSrcUrl) {
				detectedElementType = "data-src";
				break;
			}
		} else if (stl["data-srcset"] && stl["data-srcset"] != "none") {
			var dataSrcsetUrl = stl["data-srcset"].slice(4, -1).replace(/"/g, "");
			if (dataSrcsetUrl) {
				detectedElementType = "data-srcset";
				break;
			}
		} else if (el.tagName == "CANVAS") {
			detectedElementType = "canvas";
			var canvasWidth = el.width;
			var canvasHeight = el.height;
			var canvasArea = canvasWidth * canvasHeight;
			accumulatedArea += canvasArea;
			if (accumulatedArea > accumulatedAreaThreshold) {
				break;
			}
			break;
		}
	}
}

// Gemini generated this function

function detectMangaPageAndGetImageSrcs(options = {}) {
    const defaults = {
        minImageCount: 5,       // Minimum number of large images to consider it a manga page
        minImageWidth: 300,     // Minimum width of an image to be considered a panel
        minImageHeight: 400,    // Minimum height of an image to be considered a panel
        imageExtensions: /\.(jpe?g|png|gif|webp)$/i, // Common image file extensions
        lazyLoadAttributes: ['data-src', 'data-lazy-src', 'data-original', 'data-hiresp', 'data-srcset', 'data-bg'], // Common lazy load attributes
        placeholderSrcRegex: /^(data:image\/(gif|png|jpeg);base64,R0lGODlhAQABAIAAAAAAAP|pixel\.gif|spacer\.gif|1x1\.png|loading\.gif)/i, // Common placeholder src values
        minDomainMatchPercentage: 60, // Minimum percentage of images that must share the most common domain (0 to disable)
        filterByDominantDomain: true, // If true, only return images from the dominant domain (and data URIs)
        // For debugging:
        // verbose: false,
    };

    const config = { ...defaults, ...options };
    // const log = (...args) => { if (config.verbose) console.log('[MangaDetect]', ...args); };

    const allPageImages = Array.from(document.querySelectorAll('img'));
    const potentialMangaImages = [];

    for (const img of allPageImages) {
        // 1. Check visibility (basic check)
        let isVisible = true;
        if (img.offsetParent === null && !(img.offsetWidth > 0 && img.offsetHeight > 0)) {
            const style = window.getComputedStyle(img);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
                isVisible = false;
            }
        }
        // If still no dimensions (even after style check), it's likely effectively hidden or not an image meant for display
        if (img.offsetWidth === 0 && img.offsetHeight === 0 && img.naturalWidth === 0 && img.naturalHeight === 0) {
             isVisible = false;
        }
        if (!isVisible) {
            // log('Skipping non-visible image:', img.outerHTML.substring(0, 100));
            continue;
        }

        // 2. Determine the most likely source URL (considering lazy loading)
        let rawSrc = img.src; // DOM property img.src is usually absolute
        let srcFromAttribute = false;

        // Check if current src is a placeholder or too short, then look for lazy load attributes
        if (!rawSrc || rawSrc.length < 20 || config.placeholderSrcRegex.test(rawSrc)) {
            for (const attr of config.lazyLoadAttributes) {
                if (img.hasAttribute(attr) && img.getAttribute(attr)) {
                    const lazySrc = img.getAttribute(attr);
                    // data-srcset can have multiple URLs, take the first one for simplicity
                    const firstUrl = lazySrc.split(',')[0].trim().split(' ')[0];
                    rawSrc = firstUrl;
                    srcFromAttribute = true;
                    break;
                }
            }
        }

        if (!rawSrc) {
            // log('Skipping image with no valid src found:', img.outerHTML.substring(0,100));
            continue;
        }

        let imageUrl;
        let imageHostname = null;

        try {
            // Resolve rawSrc (which might be relative if from an attribute) to an absolute URL
            const absoluteUrl = new URL(rawSrc, document.baseURI).href;

            if (absoluteUrl.startsWith('data:')) {
                // It's a data URI. Check if it's a placeholder.
                if (config.placeholderSrcRegex.test(absoluteUrl)) {
                    // log('Skipping placeholder data URI:', absoluteUrl.substring(0, 70));
                    continue;
                }
                imageUrl = absoluteUrl;
                // imageHostname remains null for data URIs
            } else if (config.imageExtensions.test(absoluteUrl)) {
                // It's a regular URL, check extension
                imageUrl = absoluteUrl;
                imageHostname = new URL(imageUrl).hostname; // Get hostname for domain checking
            } else {
                // log('Skipping non-image URL or non-data URI:', absoluteUrl);
                continue; // Not a data URI and not matching image extensions
            }
        } catch (e) {
            // log('Could not parse or resolve URL:', rawSrc, e.message);
            continue; // Invalid URL
        }

        // 3. Check image dimensions
        const imgWidth = img.naturalWidth || img.offsetWidth;
        const imgHeight = img.naturalHeight || img.offsetHeight;

        if (imgWidth >= config.minImageWidth && imgHeight >= config.minImageHeight) {
            potentialMangaImages.push({
                element: img,
                src: imageUrl,
                width: imgWidth,
                height: imgHeight,
                hostname: imageHostname
            });
            // log('Potential image found:', imageUrl, `(${imgWidth}x${imgHeight})`, 'Host:', imageHostname || 'N/A (data URI)');
        } else {
            // log('Skipping image due to small dimensions:', imageUrl, `(${imgWidth}x${imgHeight})`);
        }
    }

    // log(`Found ${potentialMangaImages.length} potential images after initial filtering.`);

    // 4. Check if we have enough images to even consider further
    if (potentialMangaImages.length < config.minImageCount) {
        // log(`Failed: Not enough potential images (${potentialMangaImages.length}) to meet minImageCount (${config.minImageCount}).`);
        return null;
    }

    let imagesToConsiderForOutput = [...potentialMangaImages];

    // 5. Domain consistency check
    if (config.minDomainMatchPercentage > 0 && imagesToConsiderForOutput.length > 0) {
        const hostnameCounts = {};
        const imagesWithHostnames = imagesToConsiderForOutput.filter(imgInfo => imgInfo.hostname);

        if (imagesWithHostnames.length > 0) {
            for (const imgInfo of imagesWithHostnames) {
                hostnameCounts[imgInfo.hostname] = (hostnameCounts[imgInfo.hostname] || 0) + 1;
            }

            let dominantHostname = null;
            let maxCount = 0;
            for (const hostname in hostnameCounts) {
                if (hostnameCounts[hostname] > maxCount) {
                    maxCount = hostnameCounts[hostname];
                    dominantHostname = hostname;
                }
            }

            // Calculate percentage based on images that *have* a hostname.
            const matchPercentage = (maxCount / imagesWithHostnames.length) * 100;
            // log(`Dominant hostname: '${dominantHostname}' with ${maxCount} images. Match percentage: ${matchPercentage.toFixed(1)}% (Threshold: ${config.minDomainMatchPercentage}%)`);

            if (matchPercentage < config.minDomainMatchPercentage) {
                // log(`Failed: Domain consistency check. Match percentage ${matchPercentage.toFixed(1)}% is less than ${config.minDomainMatchPercentage}%.`);
                return null; // Fails domain consistency
            }

            if (config.filterByDominantDomain && dominantHostname) {
                const originalCount = imagesToConsiderForOutput.length;
                imagesToConsiderForOutput = imagesToConsiderForOutput.filter(imgInfo => {
                    return imgInfo.hostname === dominantHostname || !imgInfo.hostname; // Keep dominant domain images + data URIs
                });
                // log(`Filtered by dominant domain. Kept ${imagesToConsiderForOutput.length} out of ${originalCount} images.`);

                // Re-check minImageCount after filtering, as we might have dropped too many
                if (imagesToConsiderForOutput.length < config.minImageCount) {
                    // log(`Failed: Not enough images (${imagesToConsiderForOutput.length}) after filtering by dominant domain to meet minImageCount (${config.minImageCount}).`);
                    return null;
                }
            }
        } else if (imagesToConsiderForOutput.some(img => img.src && !img.src.startsWith('data:'))) {
            // This case: there are non-dataURI images, but none yielded a hostname (e.g., all invalid URLs after trying to parse)
            // If domain consistency is required, this should be a failure.
            // log("Failed: Domain consistency check required, but no valid hostnames found for external images.");
            return null;
        }
        // If all images are data URIs, imagesWithHostnames.length will be 0, and this check is effectively bypassed, which is fine.
    }

    // 6. If we passed all checks and still have enough images
    if (imagesToConsiderForOutput.length >= config.minImageCount) {
        // Sort images by their visual position on the page (top-to-bottom, then left-to-right)
        imagesToConsiderForOutput.sort((a, b) => {
            const rectA = a.element.getBoundingClientRect();
            const rectB = b.element.getBoundingClientRect();
            if (rectA.top !== rectB.top) {
                return rectA.top - rectB.top;
            }
            return rectA.left - rectB.left;
        });

        // log(`Success! Detected as manga page. Returning ${imagesToConsiderForOutput.length} image SRCs.`);
        return imagesToConsiderForOutput.map(imgInfo => imgInfo.src);
    }

    // log("Failed: Final check, not enough images or other criteria not met.");
    return null; // Not detected as a manga page
}


function showComicBtn(){
	var btn=document.createElement("button");
	btn.setAttribute("style","display:block;position:fixed;bottom:25%;right:5px; width:40px;height:40px;background-color:#eaeaea80;border-radius:50%;font-size:12px;text-align:center;z-index:99999999;");
	btn.innerHTML = "Dịch Ảnh";
	btn.onclick = function(){
		createMangaReaderOverlay();
	}
	document.body.appendChild(btn);
}

function createMangaReaderOverlay(imgs) {
    // Create the main overlay container
    const overlay = document.createElement('div');
    overlay.id = 'manga-reader-overlay';
    
    // Create styles dynamically
	var imgUrls = imgs || detectMangaPageAndGetImageSrcs();
    const style = document.createElement('style');
    style.textContent = `
        #manga-reader-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            opacity: 0;
            animation: fadeIn 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .manga-reader-container {
            width: 90%;
            height: 90%;
            background-color: #1a1a1a;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: scale(0.95);
            animation: scaleUp 0.3s ease-out 0.1s forwards;
        }
        
        @keyframes scaleUp {
            from { transform: scale(0.95); }
            to { transform: scale(1); }
        }
        
        .manga-reader-header {
            background-color: #252525;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
        }
        
        .manga-reader-title {
            color: #f0f0f0;
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .manga-reader-close {
            background-color: #e63946;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .manga-reader-close:hover {
            background-color: #d62839;
            transform: translateY(-1px);
        }
        
        .manga-reader-close:active {
            transform: translateY(0);
        }
        
        .manga-reader-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .manga-page {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateY(10px);
            animation: fadeInUp 0.4s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Custom scrollbar */
        .manga-reader-content::-webkit-scrollbar {
            width: 8px;
        }
        
        .manga-reader-content::-webkit-scrollbar-track {
            background: #252525;
        }
        
        .manga-reader-content::-webkit-scrollbar-thumb {
            background-color: #444;
            border-radius: 4px;
        }
        
        .manga-reader-content::-webkit-scrollbar-thumb:hover {
            background-color: #555;
        }
		.language-selector-container {
			display: flex;
			gap: 10px;
		}
		select {
			background-color: #333;
			color: #f0f0f0;
			border: 1px solid #444;
			border-radius: 4px;
			padding: 6px 10px;
			font-size: 14px;
			cursor: pointer;
		}
		select:hover {
			background-color: #444;
			border-color: #555;
		}
		select:focus {
			outline: none;
			border-color: #e63946;
			box-shadow: 0 0 0 2px rgba(230, 57, 70, 0.5);
		}
    `;
    
    // Create the manga reader container
    const readerContainer = document.createElement('div');
    readerContainer.className = 'manga-reader-container';
    
    // Create the header with close button
    const header = document.createElement('div');
    header.className = 'manga-reader-header';
    
    const title = document.createElement('h3');
    title.className = 'manga-reader-title';
    title.textContent = '';
	const originalLanguageSelector = document.createElement('select');
	originalLanguageSelector.innerHTML = `
		<option value="auto">Tự động</option>
		<option value="english">Tiếng Anh</option>
		<option value="japanese">Tiếng Nhật</option>
		<option value="chinese">Tiếng Trung</option>
		<option value="korea">Tiếng Việt</option>
	`;
	const targetLanguageSelector = document.createElement('select');
	targetLanguageSelector.innerHTML = `
		<option value="vi">Tiếng Việt</option>
		<option value="en">Tiếng Anh</option>
		<option value="ja">Tiếng Nhật</option>
		<option value="zh">Tiếng Trung</option>
		<option value="ko">Tiếng Hàn</option>
	`;
	const languageSelectorContainer = document.createElement('div');
	languageSelectorContainer.className = 'language-selector-container';
	languageSelectorContainer.style.display = 'flex';
	languageSelectorContainer.style.gap = '10px';
	languageSelectorContainer.appendChild(originalLanguageSelector);
	languageSelectorContainer.appendChild(targetLanguageSelector);
	header.appendChild(languageSelectorContainer);

	const pageWidthSelector = document.createElement('select');
	pageWidthSelector.innerHTML = `
		<option value="max">Tự động</option>
		<option value="1200">1200px</option>
		<option value="900">900px</option>
		<option value="600">600px</option>
		<option value="400">400px</option>
	`;
	
	header.appendChild(pageWidthSelector);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'manga-reader-close';
    closeButton.innerHTML = '&times;'; // Close icon
    closeButton.addEventListener('click', () => {
        overlay.style.animation = 'fadeIn 0.3s ease-out reverse forwards';
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 300);
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create the content area
    const content = document.createElement('div');
    content.className = 'manga-reader-content';
    
    content.innerHTML = `<iframe class="stv-translator" src="https://sangtacviet.app/comictranslator.php?isolated=true&langhint=auto" style="width:100%;height:100%;border:none;"></iframe>`;
    const frame = content.querySelector("iframe");
	frame.addEventListener("load", function() {
		frame.contentWindow.postMessage({ type: "setOriginalLanguage", originalLanguage: originalLanguageSelector.value }, "*");
		frame.contentWindow.postMessage({ type: "setTargetLanguage", targetLanguage: targetLanguageSelector.value }, "*");
		frame.contentWindow.postMessage({ type: "setComicImgUrls", data: imgUrls }, "*");
	});
	frame.reload = function() {
		frame.src = frame.src; // Reload the iframe
	}

	const saveUserSetting = (id, value) => {
		chrome.storage.sync.set({ [id]: value }, () => {
			console.log(`User setting ${id} saved:`, value);
		});
	}
	originalLanguageSelector.addEventListener('change', function() {
		frame.contentWindow.postMessage({
			type: "setOriginalLanguage",
			originalLanguage: originalLanguageSelector.value
		}, "*");
		saveUserSetting('comicOriginalLanguage', this.value);
	});

	targetLanguageSelector.addEventListener('change', function() {
		frame.contentWindow.postMessage({
			type: "setTargetLanguage",
			targetLanguage: this.value
		}, "*");
		saveUserSetting('comicTargetLanguage', this.value);
	});
	pageWidthSelector.addEventListener('change', function() {
		const width = this.value;
		const stvTranslator = content.querySelector('.stv-translator');
		if (stvTranslator) {
			if (width === 'max') {
				stvTranslator.style.width = '100%';
			} else {
				stvTranslator.style.width = width + 'px';
			}
			frame.contentWindow.postMessage({
				type: "setPageWidth",
				pageWidth: width
			}, "*");
		}
		saveUserSetting('comicPageWidth', this.value);
	});

	const loadUserSettingFor = (id, select, callBack) => {
		chrome.storage.sync.get(id, (data) => {
			var newValue = data[id];
			if (newValue !== undefined && newValue !== null) {
				select.value = newValue;
				select.querySelectorAll('option').forEach(option => {
					if (option.value === newValue) {
						option.selected = true;
					} else {
						option.selected = false;
					}
				});
				console.log(`Loaded user setting for ${id}:`, newValue);
				if (callBack) {
					callBack(newValue);
				}
			}
		});
	}
	// Load user settings for language selectors and page width
	loadUserSettingFor('comicOriginalLanguage', originalLanguageSelector);
	loadUserSettingFor('comicTargetLanguage', targetLanguageSelector);
	loadUserSettingFor('comicPageWidth', pageWidthSelector, function(value) {
		pageWidthSelector.dispatchEvent(new Event('change'));
	});
    // Assemble all components
    readerContainer.appendChild(header);
    readerContainer.appendChild(content);
    overlay.appendChild(style);
    overlay.appendChild(readerContainer);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Close with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeButton.click();
        }
    });
}

window.addEventListener('load', () => {
    setTimeout(() => { // Give a little extra time for JS layout changes or lazy loads
		var srcs = detectMangaPageAndGetImageSrcs();
        if (srcs) {
            console.log("This page likely contains manga!");
            // Add a class to the body, or send a message, etc.
            document.body.classList.add('manga-detected');
			console.log(srcs);
			showComicBtn();
        } else {
            console.log("This page does not seem to be manga.");
        }
    }, 4000); // Adjust delay as needed
});

