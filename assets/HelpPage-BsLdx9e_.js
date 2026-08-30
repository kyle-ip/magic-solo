var Se=Object.defineProperty;var Ae=(n,e,t)=>e in n?Se(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var k=(n,e,t)=>Ae(n,typeof e!="symbol"?e+"":e,t);import{u as Re,r as Pe,j as F,s as Ce}from"./index-BuN-NZ8s.js";function j(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var T=j();function he(n){T=n}var C={exec:()=>null};function $(n){let e=[];return t=>{let s=Math.max(0,Math.min(3,t-1)),r=e[s];return r||(r=n(s),e[s]=r),r}}function g(n,e=""){let t=typeof n=="string"?n:n.source,s={replace:(r,i)=>{let l=typeof i=="string"?i:i.source;return l=l.replace(b.caret,"$1"),t=t.replace(r,l),s},getRegex:()=>new RegExp(t,e)};return s}var Ie=((n="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+n)}catch{return!1}})(),b={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:n=>new RegExp(`^( {0,3}${n})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:$(n=>new RegExp(`^ {0,${n}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:$(n=>new RegExp(`^ {0,${n}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:$(n=>new RegExp(`^ {0,${n}}(?:\`\`\`|~~~)`)),headingBeginRegex:$(n=>new RegExp(`^ {0,${n}}#`)),htmlBeginRegex:$(n=>new RegExp(`^ {0,${n}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:$(n=>new RegExp(`^ {0,${n}}>`))},Te=/^(?:[ \t]*(?:\n|$))+/,$e=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,ve=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,z=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Ee=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,J=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,pe=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,ue=g(pe).replace(/bull/g,J).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Le=g(pe).replace(/bull/g,J).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),K=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/,_e=/^[^\n]+/,X=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,ze=g(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",X).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),De=g(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,J).getRegex(),H="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Y=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Be=g("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Y).replace("tag",H).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),de=n=>g(K).replace("hr",z).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~~~)[^\\n]*\\n").replace("list",n).replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",H).getRegex(),Me=de(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),Ne=de(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/),Ge=g(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Ne).getRegex(),V={blockquote:Ge,code:$e,def:ze,fences:ve,heading:Ee,hr:z,html:Be,lheading:ue,list:De,newline:Te,paragraph:Me,table:C,text:_e},re=g("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",z).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~~~)[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",H).getRegex(),Oe={...V,lheading:Le,table:re,paragraph:g(K).replace("hr",z).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",re).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~~~)[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",H).getRegex()},qe={...V,html:g(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Y).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:C,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:g(K).replace("hr",z).replace("heading",` *#{1,6} *[^
]`).replace("lheading",ue).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},He=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,We=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,ge=/^( {2,}|\\)\n(?!\s*$)/,Fe=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,R=/[\p{P}\p{S}]/u,v=/[\s\p{P}\p{S}]/u,D=/[^\s\p{P}\p{S}]/u,Ue=g(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,v).getRegex(),Ze=/[\p{Pi}\p{Ps}"']/u,fe=/(?!~)[\p{P}\p{S}]/u,Qe=/(?!~)[\s\p{P}\p{S}]/u,je=/(?:[^\s\p{P}\p{S}]|~)/u,Je=g(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Ie?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),ke=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,Ke=g(ke,"u").replace(/punct/g,R).getRegex(),Xe=g(ke,"u").replace(/punct/g,fe).getRegex(),Ye=/^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/,Ve=g(Ye,"u").replace(/openQuote/g,Ze).replace(/punct/g,R).getRegex(),me="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",et=g(me,"gu").replace(/notPunctSpace/g,D).replace(/punctSpace/g,v).replace(/punct/g,R).getRegex(),tt=g(me,"gu").replace(/notPunctSpace/g,je).replace(/punctSpace/g,Qe).replace(/punct/g,fe).getRegex(),nt="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)",rt=g(nt,"gu").replace(/notPunctSpace/g,D).replace(/punctSpace/g,v).replace(/punct/g,R).getRegex(),st=g("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,D).replace(/punctSpace/g,v).replace(/punct/g,R).getRegex(),at="^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)",it=g(at,"gu").replace(/notPunctSpace/g,D).replace(/punctSpace/g,v).replace(/punct/g,R).getRegex(),lt=g(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,R).getRegex(),ot="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",ct=g(ot,"gu").replace(/notPunctSpace/g,D).replace(/punctSpace/g,v).replace(/punct/g,R).getRegex(),ht=g(/\\(punct)/,"gu").replace(/punct/g,R).getRegex(),pt=g(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),ut=g(Y).replace("(?:-->|$)","-->").getRegex(),dt=g("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",ut).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),G=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,gt=g(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",G).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),be=g(/^!?\[(label)\]\[(ref)\]/).replace("label",G).replace("ref",X).getRegex(),ye=g(/^!?\[(ref)\](?:\[\])?/).replace("ref",X).getRegex(),ft=g("reflink|nolink(?!\\()","g").replace("reflink",be).replace("nolink",ye).getRegex(),se=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,ee={_backpedal:C,anyPunctuation:ht,autolink:pt,blockSkip:Je,br:ge,code:We,del:C,delLDelim:C,delRDelim:C,emStrongLDelim:Ke,emStrongRDelimAst:et,emStrongRDelimUnd:st,escape:He,link:gt,nolink:ye,punctuation:Ue,reflink:be,reflinkSearch:ft,tag:dt,text:Fe,url:C},kt={...ee,emStrongLDelim:Ve,emStrongRDelimAst:rt,emStrongRDelimUnd:it,link:g(/^!?\[(label)\]\((.*?)\)/).replace("label",G).getRegex(),reflink:g(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",G).getRegex()},U={...ee,emStrongRDelimAst:tt,emStrongLDelim:Xe,delLDelim:lt,delRDelim:ct,url:g(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",se).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:g(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",se).getRegex()},mt={...U,br:g(ge).replace("{2,}","*").getRegex(),text:g(U.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},M={normal:V,gfm:Oe,pedantic:qe},L={normal:ee,gfm:U,breaks:mt,pedantic:kt},bt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ae=n=>bt[n];function A(n,e){if(e){if(b.escapeTest.test(n))return n.replace(b.escapeReplace,ae)}else if(b.escapeTestNoEncode.test(n))return n.replace(b.escapeReplaceNoEncode,ae);return n}function ie(n){try{n=encodeURI(n).replace(b.percentDecode,"%")}catch{return null}return n}function le(n,e){var i;let t=n.replace(b.findPipe,(l,o,a)=>{let p=!1,c=o;for(;--c>=0&&a[c]==="\\";)p=!p;return p?"|":" |"}),s=t.split(b.splitPipe),r=0;if(s[0].trim()||s.shift(),s.length>0&&!((i=s.at(-1))!=null&&i.trim())&&s.pop(),e)if(s.length>e)s.splice(e);else for(;s.length<e;)s.push("");for(;r<s.length;r++)s[r]=s[r].trim().replace(b.slashPipe,"|");return s}function P(n,e,t){let s=n.length;if(s===0)return"";let r=0;for(;r<s&&n.charAt(s-r-1)===e;)r++;return n.slice(0,s-r)}function oe(n){let e=n.split(`
`),t=e.length-1;for(;t>=0&&b.blankLine.test(e[t]);)t--;return e.length-t<=2?n:e.slice(0,t+1).join(`
`)}function yt(n,e){if(n.indexOf(e[1])===-1)return-1;let t=0;for(let s=0;s<n.length;s++)if(n[s]==="\\")s++;else if(n[s]===e[0])t++;else if(n[s]===e[1]&&(t--,t<0))return s;return t>0?-2:-1}function xt(n,e=0){let t=e,s="";for(let r of n)if(r==="	"){let i=4-t%4;s+=" ".repeat(i),t+=i}else s+=r,t++;return s}function ce(n,e,t,s,r){let i=e.href,l=e.title||null,o=n[1].replace(r.other.outputLinkReplace,"$1");s.state.inLink=!0;let a={type:n[0].charAt(0)==="!"?"image":"link",raw:t,href:i,title:l,text:o,tokens:s.inlineTokens(o)};return s.state.inLink=!1,a}function wt(n,e,t){let s=n.match(t.other.indentCodeCompensation);if(s===null)return e;let r=s[1];return e.split(`
`).map(i=>{let l=i.match(t.other.beginningSpace);if(l===null)return i;let[o]=l;return o.length>=r.length?i.slice(r.length):i}).join(`
`)}var O=class{constructor(n){k(this,"options");k(this,"rules");k(this,"lexer");this.options=n||T}space(n){let e=this.rules.block.newline.exec(n);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(n){let e=this.rules.block.code.exec(n);if(e){let t=this.options.pedantic?e[0]:oe(e[0]),s=t.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t,codeBlockStyle:"indented",text:s}}}fences(n){let e=this.rules.block.fences.exec(n);if(e){let t=e[0],s=wt(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:s}}}heading(n){let e=this.rules.block.heading.exec(n);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){let s=P(t,"#");(this.options.pedantic||!s||this.rules.other.endingSpaceChar.test(s))&&(t=s.trim())}return{type:"heading",raw:P(e[0],`
`),depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(n){let e=this.rules.block.hr.exec(n);if(e)return{type:"hr",raw:P(e[0],`
`)}}blockquote(n){let e=this.rules.block.blockquote.exec(n);if(e){let t=P(e[0],`
`).split(`
`),s="",r="",i=[];for(;t.length>0;){let l=!1,o=[],a;for(a=0;a<t.length;a++)if(this.rules.other.blockquoteStart.test(t[a]))o.push(t[a]),l=!0;else if(!l)o.push(t[a]);else break;t=t.slice(a);let p=o.join(`
`),c=p.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");s=s?`${s}
${p}`:p,r=r?`${r}
${c}`:c;let d=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,i,!0),this.lexer.state.top=d,t.length===0)break;let h=i.at(-1);if((h==null?void 0:h.type)==="code")break;if((h==null?void 0:h.type)==="blockquote"){let m=h,u=t.join(`
`),y=m.raw+`
`+u.replace(this.rules.other.blockquoteSetextReplace2,""),S=this.blockquote(y);i[i.length-1]=S,s=`${s}
${u}`,r=r.substring(0,r.length-m.text.length)+S.text;break}else if((h==null?void 0:h.type)==="list"){let m=h,u=m.raw+`
`+t.join(`
`),y=this.list(u);i[i.length-1]=y,s=s.substring(0,s.length-h.raw.length)+y.raw,r=r.substring(0,r.length-m.raw.length)+y.raw,t=u.substring(i.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:s,tokens:i,text:r}}}list(n){let e=this.rules.block.list.exec(n);if(e){let t=e[1].trim(),s=t.length>1,r={type:"list",raw:"",ordered:s,start:s?+t.slice(0,-1):"",loose:!1,items:[]};t=s?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=s?t:"[*+-]");let i=this.rules.other.listItemRegex(t),l=!1;for(;n;){let a=!1,p="",c="";if(!(e=i.exec(n))||this.rules.block.hr.test(n))break;p=e[0],n=n.substring(p.length);let d=xt(e[2].split(`
`,1)[0],e[1].length),h=n.split(`
`,1)[0],m=!d.trim(),u=0;if(this.options.pedantic?(u=2,c=d.trimStart()):m?u=e[1].length+1:(u=d.search(this.rules.other.nonSpaceChar),u=u>4?1:u,c=d.slice(u),u+=e[1].length),m&&this.rules.other.blankLine.test(h)&&(p+=h+`
`,n=n.substring(h.length+1),a=!0),!a){let y=this.rules.other.nextBulletRegex(u),S=this.rules.other.hrRegex(u),B=this.rules.other.fencesBeginRegex(u),ne=this.rules.other.headingBeginRegex(u),xe=this.rules.other.htmlBeginRegex(u),we=this.rules.other.blockquoteBeginRegex(u);for(;n;){let W=n.split(`
`,1)[0],E;if(h=W,this.options.pedantic?(h=h.replace(this.rules.other.listReplaceNesting,"  "),E=h):E=h.replace(this.rules.other.tabCharGlobal,"    "),B.test(h)||ne.test(h)||xe.test(h)||we.test(h)||y.test(h)||S.test(h))break;if(E.search(this.rules.other.nonSpaceChar)>=u||!h.trim())c+=`
`+E.slice(u);else{if(m||d.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||B.test(d)||ne.test(d)||S.test(d))break;c+=`
`+h}m=!h.trim(),p+=W+`
`,n=n.substring(W.length+1),d=E.slice(u)}}r.loose||(l?r.loose=!0:this.rules.other.doubleBlankLine.test(p)&&(l=!0)),r.items.push({type:"list_item",raw:p,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),r.raw+=p}let o=r.items.at(-1);if(o)o.raw=o.raw.trimEnd(),o.text=o.text.trimEnd();else return;r.raw=r.raw.trimEnd();for(let a of r.items){this.lexer.state.top=!1,a.tokens=this.lexer.blockTokens(a.text,[]);let p=a.tokens[0];if(a.task&&((p==null?void 0:p.type)==="text"||(p==null?void 0:p.type)==="paragraph")){a.text=a.text.replace(this.rules.other.listReplaceTask,""),p.raw=p.raw.replace(this.rules.other.listReplaceTask,""),p.text=p.text.replace(this.rules.other.listReplaceTask,"");for(let d=this.lexer.inlineQueue.length-1;d>=0;d--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[d].src)){this.lexer.inlineQueue[d].src=this.lexer.inlineQueue[d].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(a.raw);if(c){let d={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};a.checked=d.checked,r.loose?a.tokens[0]&&["paragraph","text"].includes(a.tokens[0].type)&&"tokens"in a.tokens[0]&&a.tokens[0].tokens?(a.tokens[0].raw=d.raw+a.tokens[0].raw,a.tokens[0].text=d.raw+a.tokens[0].text,a.tokens[0].tokens.unshift(d)):a.tokens.unshift({type:"paragraph",raw:d.raw,text:d.raw,tokens:[d]}):a.tokens.unshift(d)}}else a.task&&(a.task=!1);if(!r.loose){let c=a.tokens.filter(h=>h.type==="space"),d=c.length>0&&c.some(h=>this.rules.other.anyLine.test(h.raw));r.loose=d}}if(r.loose)for(let a of r.items){a.loose=!0;for(let p of a.tokens)p.type==="text"&&(p.type="paragraph")}return r}}html(n){let e=this.rules.block.html.exec(n);if(e){let t=oe(e[0]);return{type:"html",block:!0,raw:t,pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:t}}}def(n){let e=this.rules.block.def.exec(n);if(e){let t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),s=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:P(e[0],`
`),href:s,title:r}}}table(n){var l;let e=this.rules.block.table.exec(n);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let t=le(e[1]),s=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=(l=e[3])!=null&&l.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],i={type:"table",raw:P(e[0],`
`),header:[],align:[],rows:[]};if(t.length===s.length){for(let o of s)this.rules.other.tableAlignRight.test(o)?i.align.push("right"):this.rules.other.tableAlignCenter.test(o)?i.align.push("center"):this.rules.other.tableAlignLeft.test(o)?i.align.push("left"):i.align.push(null);for(let o=0;o<t.length;o++)i.header.push({text:t[o],tokens:this.lexer.inline(t[o]),header:!0,align:i.align[o]});for(let o of r)i.rows.push(le(o,i.header.length).map((a,p)=>({text:a,tokens:this.lexer.inline(a),header:!1,align:i.align[p]})));return i}}lheading(n){let e=this.rules.block.lheading.exec(n);if(e){let t=e[1].trim();return{type:"heading",raw:P(e[0],`
`),depth:e[2].charAt(0)==="="?1:2,text:t,tokens:this.lexer.inline(t)}}}paragraph(n){let e=this.rules.block.paragraph.exec(n);if(e){let t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(n){let e=this.rules.block.text.exec(n);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(n){let e=this.rules.inline.escape.exec(n);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(n){let e=this.rules.inline.tag.exec(n);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(n){let e=this.rules.inline.link.exec(n);if(e){let t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let i=P(t.slice(0,-1),"\\");if((t.length-i.length)%2===0)return}else{let i=yt(e[2],"()");if(i===-2)return;if(i>-1){let l=(e[0].indexOf("!")===0?5:4)+e[1].length+i;e[2]=e[2].substring(0,i),e[0]=e[0].substring(0,l).trim(),e[3]=""}}let s=e[2],r="";if(this.options.pedantic){let i=this.rules.other.pedanticHrefTitle.exec(s);i&&(s=i[1],r=i[3])}else r=e[3]?e[3].slice(1,-1):"";return s=s.trim(),this.rules.other.startAngleBracket.test(s)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?s=s.slice(1):s=s.slice(1,-1)),ce(e,{href:s&&s.replace(this.rules.inline.anyPunctuation,"$1"),title:r&&r.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(n,e){let t;if((t=this.rules.inline.reflink.exec(n))||(t=this.rules.inline.nolink.exec(n))){let s=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),r=e[s.toLowerCase()];if(!r){let i=t[0].charAt(0);return{type:"text",raw:i,text:i}}return ce(t,r,t[0],this.lexer,this.rules)}}emStrong(n,e,t=""){let s=this.rules.inline.emStrongLDelim.exec(n);if(!(!s||!s[1]&&!s[2]&&!s[3]&&!s[4]||s[4]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(s[1]||s[3])||!t||this.rules.inline.punctuation.exec(t))){let r=[...s[0]].length-1,i,l,o=r,a=0,p=s[0][0],c=t===p,d=p==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(d.lastIndex=0,e=e.slice(-1*n.length+r);(s=d.exec(e))!==null;){if(i=s[1]||s[2]||s[3]||s[4]||s[5]||s[6],!i)continue;if(l=[...i].length,s[3]||s[4]){o+=l;continue}else if(s[5]||s[6]){if(r%3&&!((r+l)%3)){a+=l;continue}if(c)break}if(o-=l,o>0)continue;l=Math.min(l,l+o+a);let h=[...s[0]][0].length,m=n.slice(0,r+s.index+h+l);if(Math.min(r,l)%2){let y=m.slice(1,-1);return{type:"em",raw:m,text:y,tokens:this.lexer.inlineTokens(y)}}let u=m.slice(2,-2);return{type:"strong",raw:m,text:u,tokens:this.lexer.inlineTokens(u)}}}}codespan(n){let e=this.rules.inline.code.exec(n);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," "),s=this.rules.other.nonSpaceChar.test(t),r=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return s&&r&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(n){let e=this.rules.inline.br.exec(n);if(e)return{type:"br",raw:e[0]}}del(n,e,t=""){let s=this.rules.inline.delLDelim.exec(n);if(s&&(!s[1]||!t||this.rules.inline.punctuation.exec(t))){let r=[...s[0]].length-1,i,l,o=r,a=this.rules.inline.delRDelim;for(a.lastIndex=0,e=e.slice(-1*n.length+r);(s=a.exec(e))!==null;){if(i=s[1]||s[2]||s[3]||s[4]||s[5]||s[6],!i||(l=[...i].length,l!==r))continue;if(s[3]||s[4]){o+=l;continue}if(o-=l,o>0)continue;l=Math.min(l,l+o);let p=[...s[0]][0].length,c=n.slice(0,r+s.index+p+l),d=c.slice(r,-r);return{type:"del",raw:c,text:d,tokens:this.lexer.inlineTokens(d)}}}}autolink(n){let e=this.rules.inline.autolink.exec(n);if(e){let t,s;return e[2]==="@"?(t=e[1],s="mailto:"+t):(t=e[1],s=t),{type:"link",raw:e[0],text:t,href:s,tokens:[{type:"text",raw:t,text:t}]}}}url(n){var t;let e;if(e=this.rules.inline.url.exec(n)){let s,r;if(e[2]==="@")s=e[0],r="mailto:"+s;else{let i;do i=e[0],e[0]=((t=this.rules.inline._backpedal.exec(e[0]))==null?void 0:t[0])??"";while(i!==e[0]);s=e[0],e[1]==="www."?r="http://"+e[0]:r=e[0]}return{type:"link",raw:e[0],text:s,href:r,tokens:[{type:"text",raw:s,text:s}]}}}inlineText(n){let e=this.rules.inline.text.exec(n);if(e){let t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},x=class Z{constructor(e){k(this,"tokens");k(this,"options");k(this,"state");k(this,"inlineQueue");k(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||T,this.options.tokenizer=this.options.tokenizer||new O,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let t={other:b,block:M.normal,inline:L.normal};this.options.pedantic?(t.block=M.pedantic,t.inline=L.pedantic):this.options.gfm&&(t.block=M.gfm,this.options.breaks?t.inline=L.breaks:t.inline=L.gfm),this.tokenizer.rules=t}static get rules(){return{block:M,inline:L}}static lex(e,t){return new Z(t).lex(e)}static lexInline(e,t){return new Z(t).inlineTokens(e)}lex(e){e=e.replace(b.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let s=this.inlineQueue[t];this.inlineTokens(s.src,s.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],s=!1){var i,l,o;this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(b.tabCharGlobal,"    ").replace(b.spaceLine,""));let r=1/0;for(;e;){if(e.length<r)r=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}let a;if((l=(i=this.options.extensions)==null?void 0:i.block)!=null&&l.some(c=>(a=c.call({lexer:this},e,t))?(e=e.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.space(e)){e=e.substring(a.raw.length);let c=t.at(-1);a.raw.length===1&&c!==void 0?c.raw+=`
`:t.push(a);continue}if(a=this.tokenizer.code(e)){e=e.substring(a.raw.length);let c=t.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.at(-1).src=c.text):t.push(a);continue}if(a=this.tokenizer.fences(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.heading(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.hr(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.blockquote(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.list(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.html(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.def(e)){e=e.substring(a.raw.length);let c=t.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[a.tag]||(this.tokens.links[a.tag]={href:a.href,title:a.title},t.push(a));continue}if(a=this.tokenizer.table(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.lheading(e)){e=e.substring(a.raw.length),t.push(a);continue}let p=e;if((o=this.options.extensions)!=null&&o.startBlock){let c=1/0,d=e.slice(1),h;this.options.extensions.startBlock.forEach(m=>{h=m.call({lexer:this},d),typeof h=="number"&&h>=0&&(c=Math.min(c,h))}),c<1/0&&c>=0&&(p=e.substring(0,c+1))}if(this.state.top&&(a=this.tokenizer.paragraph(p))){let c=t.at(-1);s&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):t.push(a),s=p.length!==e.length,e=e.substring(a.raw.length);continue}if(a=this.tokenizer.text(e)){e=e.substring(a.raw.length);let c=t.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):t.push(a);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var o,a,p,c,d;this.tokenizer.lexer=this;let s=e;if(this.tokens.links){let h=Object.keys(this.tokens.links);h.length>0&&(s=s.replace(this.tokenizer.rules.inline.reflinkSearch,m=>h.includes(m.slice(m.lastIndexOf("[")+1,-1))?"["+"a".repeat(m.length-2)+"]":m))}s=s.replace(this.tokenizer.rules.inline.anyPunctuation,"++"),s=s.replace(this.tokenizer.rules.inline.blockSkip,(h,m,u)=>{let y=u?u.length:0;return h.slice(0,y)+"["+"a".repeat(h.length-y-2)+"]"}),s=((a=(o=this.options.hooks)==null?void 0:o.emStrongMask)==null?void 0:a.call({lexer:this},s))??s;let r=!1,i="",l=1/0;for(;e;){if(e.length<l)l=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}r||(i=""),r=!1;let h;if((c=(p=this.options.extensions)==null?void 0:p.inline)!=null&&c.some(u=>(h=u.call({lexer:this},e,t))?(e=e.substring(h.raw.length),t.push(h),!0):!1))continue;if(h=this.tokenizer.escape(e)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.tag(e)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.link(e)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(h.raw.length);let u=t.at(-1);h.type==="text"&&(u==null?void 0:u.type)==="text"?(u.raw+=h.raw,u.text+=h.text):t.push(h);continue}if(h=this.tokenizer.emStrong(e,s,i)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.codespan(e)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.br(e)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.del(e,s,i)){e=e.substring(h.raw.length),t.push(h);continue}if(h=this.tokenizer.autolink(e)){e=e.substring(h.raw.length),t.push(h);continue}if(!this.state.inLink&&(h=this.tokenizer.url(e))){e=e.substring(h.raw.length),t.push(h);continue}let m=e;if((d=this.options.extensions)!=null&&d.startInline){let u=1/0,y=e.slice(1),S;this.options.extensions.startInline.forEach(B=>{S=B.call({lexer:this},y),typeof S=="number"&&S>=0&&(u=Math.min(u,S))}),u<1/0&&u>=0&&(m=e.substring(0,u+1))}if(h=this.tokenizer.inlineText(m)){e=e.substring(h.raw.length),h.raw.slice(-1)!=="_"&&(i=h.raw.slice(-1)),r=!0;let u=t.at(-1);(u==null?void 0:u.type)==="text"?(u.raw+=h.raw,u.text+=h.text):t.push(h);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return t}infiniteLoopError(e){let t="Infinite loop on byte: "+e;if(this.options.silent)console.error(t);else throw new Error(t)}},q=class{constructor(n){k(this,"options");k(this,"parser");this.options=n||T}space(n){return""}code({text:n,lang:e,escaped:t}){var i;let s=(i=(e||"").match(b.notSpaceStart))==null?void 0:i[0],r=n.replace(b.endingNewline,"")+`
`;return s?'<pre><code class="language-'+A(s)+'">'+(t?r:A(r,!0))+`</code></pre>
`:"<pre><code>"+(t?r:A(r,!0))+`</code></pre>
`}blockquote({tokens:n}){return`<blockquote>
${this.parser.parse(n)}</blockquote>
`}html({text:n}){return n}def(n){return""}heading({tokens:n,depth:e}){return`<h${e}>${this.parser.parseInline(n)}</h${e}>
`}hr(n){return`<hr>
`}list(n){let e=n.ordered,t=n.start,s="";for(let l=0;l<n.items.length;l++){let o=n.items[l];s+=this.listitem(o)}let r=e?"ol":"ul",i=e&&t!==1?' start="'+t+'"':"";return"<"+r+i+`>
`+s+"</"+r+`>
`}listitem(n){return`<li>${this.parser.parse(n.tokens)}</li>
`}checkbox({checked:n}){return"<input "+(n?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:n}){return`<p>${this.parser.parseInline(n)}</p>
`}table(n){let e="",t="";for(let r=0;r<n.header.length;r++)t+=this.tablecell(n.header[r]);e+=this.tablerow({text:t});let s="";for(let r=0;r<n.rows.length;r++){let i=n.rows[r];t="";for(let l=0;l<i.length;l++)t+=this.tablecell(i[l]);s+=this.tablerow({text:t})}return s&&(s=`<tbody>${s}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+s+`</table>
`}tablerow({text:n}){return`<tr>
${n}</tr>
`}tablecell(n){let e=this.parser.parseInline(n.tokens),t=n.header?"th":"td";return(n.align?`<${t} align="${n.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:n}){return`<strong>${this.parser.parseInline(n)}</strong>`}em({tokens:n}){return`<em>${this.parser.parseInline(n)}</em>`}codespan({text:n}){return`<code>${A(n,!0)}</code>`}br(n){return"<br>"}del({tokens:n}){return`<del>${this.parser.parseInline(n)}</del>`}link({href:n,title:e,tokens:t}){let s=this.parser.parseInline(t),r=ie(n);if(r===null)return s;n=r;let i='<a href="'+n+'"';return e&&(i+=' title="'+A(e)+'"'),i+=">"+s+"</a>",i}image({href:n,title:e,text:t,tokens:s}){s&&(t=this.parser.parseInline(s,this.parser.textRenderer));let r=ie(n);if(r===null)return A(t);n=r;let i=`<img src="${n}" alt="${A(t)}"`;return e&&(i+=` title="${A(e)}"`),i+=">",i}text(n){return"tokens"in n&&n.tokens?this.parser.parseInline(n.tokens):"escaped"in n&&n.escaped?n.text:A(n.text)}},te=class{strong({text:n}){return n}em({text:n}){return n}codespan({text:n}){return n}del({text:n}){return n}html({text:n}){return n}text({text:n}){return n}link({text:n}){return""+n}image({text:n}){return""+n}br(){return""}checkbox({raw:n}){return n}},w=class Q{constructor(e){k(this,"options");k(this,"renderer");k(this,"textRenderer");this.options=e||T,this.options.renderer=this.options.renderer||new q,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new te}static parse(e,t){return new Q(t).parse(e)}static parseInline(e,t){return new Q(t).parseInline(e)}parse(e){var s,r;this.renderer.parser=this;let t="";for(let i=0;i<e.length;i++){let l=e[i];if((r=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&r[l.type]){let a=l,p=this.options.extensions.renderers[a.type].call({parser:this},a);if(p!==!1||!["space","hr","heading","code","table","blockquote","list","checkbox","html","def","paragraph","text"].includes(a.type)){t+=p||"";continue}}let o=l;switch(o.type){case"space":{t+=this.renderer.space(o);break}case"hr":{t+=this.renderer.hr(o);break}case"heading":{t+=this.renderer.heading(o);break}case"code":{t+=this.renderer.code(o);break}case"table":{t+=this.renderer.table(o);break}case"blockquote":{t+=this.renderer.blockquote(o);break}case"list":{t+=this.renderer.list(o);break}case"checkbox":{t+=this.renderer.checkbox(o);break}case"html":{t+=this.renderer.html(o);break}case"def":{t+=this.renderer.def(o);break}case"paragraph":{t+=this.renderer.paragraph(o);break}case"text":{t+=this.renderer.text(o);break}default:{let a='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw new Error(a)}}}return t}parseInline(e,t=this.renderer){var r,i;this.renderer.parser=this;let s="";for(let l=0;l<e.length;l++){let o=e[l];if((i=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&i[o.type]){let p=this.options.extensions.renderers[o.type].call({parser:this},o);if(p!==!1||!["escape","html","link","image","checkbox","strong","em","codespan","br","del","text"].includes(o.type)){s+=p||"";continue}}let a=o;switch(a.type){case"escape":{s+=t.text(a);break}case"html":{s+=t.html(a);break}case"link":{s+=t.link(a);break}case"image":{s+=t.image(a);break}case"checkbox":{s+=t.checkbox(a);break}case"strong":{s+=t.strong(a);break}case"em":{s+=t.em(a);break}case"codespan":{s+=t.codespan(a);break}case"br":{s+=t.br(a);break}case"del":{s+=t.del(a);break}case"text":{s+=t.text(a);break}default:{let p='Token with "'+a.type+'" type was not found.';if(this.options.silent)return console.error(p),"";throw new Error(p)}}}return s}},N,_=(N=class{constructor(n){k(this,"options");k(this,"block");this.options=n||T}preprocess(n){return n}postprocess(n){return n}processAllTokens(n){return n}emStrongMask(n){return n}provideLexer(n=this.block){return n?x.lex:x.lexInline}provideParser(n=this.block){return n?w.parse:w.parseInline}},k(N,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),k(N,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),N),St=class{constructor(...n){k(this,"defaults",j());k(this,"options",this.setOptions);k(this,"parse",this.parseMarkdown(!0));k(this,"parseInline",this.parseMarkdown(!1));k(this,"Parser",w);k(this,"Renderer",q);k(this,"TextRenderer",te);k(this,"Lexer",x);k(this,"Tokenizer",O);k(this,"Hooks",_);this.use(...n)}walkTokens(n,e){var s,r;let t=[];for(let i of n)switch(t=t.concat(e.call(this,i)),i.type){case"table":{let l=i;for(let o of l.header)t=t.concat(this.walkTokens(o.tokens,e));for(let o of l.rows)for(let a of o)t=t.concat(this.walkTokens(a.tokens,e));break}case"list":{let l=i;t=t.concat(this.walkTokens(l.items,e));break}default:{let l=i;(r=(s=this.defaults.extensions)==null?void 0:s.childTokens)!=null&&r[l.type]?this.defaults.extensions.childTokens[l.type].forEach(o=>{let a=l[o].flat(1/0);t=t.concat(this.walkTokens(a,e))}):l.tokens&&(t=t.concat(this.walkTokens(l.tokens,e)))}}return t}use(...n){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return n.forEach(t=>{let s={...t};if(s.async=this.defaults.async||s.async||!1,t.extensions&&(t.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){let i=e.renderers[r.name];i?e.renderers[r.name]=function(...l){let o=r.renderer.apply(this,l);return o===!1&&(o=i.apply(this,l)),o}:e.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let i=e[r.level];i?i.unshift(r.tokenizer):e[r.level]=[r.tokenizer],r.start&&(r.level==="block"?e.startBlock?e.startBlock.push(r.start):e.startBlock=[r.start]:r.level==="inline"&&(e.startInline?e.startInline.push(r.start):e.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(e.childTokens[r.name]=r.childTokens)}),s.extensions=e),t.renderer){let r=this.defaults.renderer||new q(this.defaults);for(let i in t.renderer){if(!(i in r))throw new Error(`renderer '${i}' does not exist`);if(["options","parser"].includes(i))continue;let l=i,o=t.renderer[l],a=r[l];r[l]=(...p)=>{let c=o.apply(r,p);return c===!1&&(c=a.apply(r,p)),c||""}}s.renderer=r}if(t.tokenizer){let r=this.defaults.tokenizer||new O(this.defaults);for(let i in t.tokenizer){if(!(i in r))throw new Error(`tokenizer '${i}' does not exist`);if(["options","rules","lexer"].includes(i))continue;let l=i,o=t.tokenizer[l],a=r[l];r[l]=(...p)=>{let c=o.apply(r,p);return c===!1&&(c=a.apply(r,p)),c}}s.tokenizer=r}if(t.hooks){let r=this.defaults.hooks||new _;for(let i in t.hooks){if(!(i in r))throw new Error(`hook '${i}' does not exist`);if(["options","block"].includes(i))continue;let l=i,o=t.hooks[l],a=r[l];_.passThroughHooks.has(i)?r[l]=p=>{if(this.defaults.async&&_.passThroughHooksRespectAsync.has(i))return(async()=>{let d=await o.call(r,p);return a.call(r,d)})();let c=o.call(r,p);return a.call(r,c)}:r[l]=(...p)=>{if(this.defaults.async)return(async()=>{let d=await o.apply(r,p);return d===!1&&(d=await a.apply(r,p)),d})();let c=o.apply(r,p);return c===!1&&(c=a.apply(r,p)),c}}s.hooks=r}if(t.walkTokens){let r=this.defaults.walkTokens,i=t.walkTokens;s.walkTokens=function(l){let o=[];return o.push(i.call(this,l)),r&&(o=o.concat(r.call(this,l))),o}}this.defaults={...this.defaults,...s}}),this}setOptions(n){return this.defaults={...this.defaults,...n},this}lexer(n,e){return x.lex(n,e??this.defaults)}parser(n,e){return w.parse(n,e??this.defaults)}parseMarkdown(n){return(e,t)=>{let s={...t},r={...this.defaults,...s},i=this.onError(!!r.silent,!!r.async);if(this.defaults.async===!0&&s.async===!1)return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return i(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return i(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(r.hooks&&(r.hooks.options=r,r.hooks.block=n),r.async)return(async()=>{let l=r.hooks?await r.hooks.preprocess(e):e,o=await(r.hooks?await r.hooks.provideLexer(n):n?x.lex:x.lexInline)(l,r),a=r.hooks?await r.hooks.processAllTokens(o):o;r.walkTokens&&await Promise.all(this.walkTokens(a,r.walkTokens));let p=await(r.hooks?await r.hooks.provideParser(n):n?w.parse:w.parseInline)(a,r);return r.hooks?await r.hooks.postprocess(p):p})().catch(i);try{r.hooks&&(e=r.hooks.preprocess(e));let l=(r.hooks?r.hooks.provideLexer(n):n?x.lex:x.lexInline)(e,r);r.hooks&&(l=r.hooks.processAllTokens(l)),r.walkTokens&&this.walkTokens(l,r.walkTokens);let o=(r.hooks?r.hooks.provideParser(n):n?w.parse:w.parseInline)(l,r);return r.hooks&&(o=r.hooks.postprocess(o)),o}catch(l){return i(l)}}}onError(n,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,n){let s="<p>An error occurred:</p><pre>"+A(t.message+"",!0)+"</pre>";return e?Promise.resolve(s):s}if(e)return Promise.reject(t);throw t}}},I=new St;function f(n,e){return I.parse(n,e)}f.options=f.setOptions=function(n){return I.setOptions(n),f.defaults=I.defaults,he(f.defaults),f};f.getDefaults=j;f.defaults=T;function At(...n){return I.use(...n),f.defaults=I.defaults,he(f.defaults),f}f.use=At;f.walkTokens=function(n,e){return I.walkTokens(n,e)};f.parseInline=I.parseInline;f.Parser=w;f.parser=w.parse;f.Renderer=q;f.TextRenderer=te;f.Lexer=x;f.lexer=x.lex;f.Tokenizer=O;f.Hooks=_;f.parse=f;f.options;f.setOptions;f.walkTokens;f.parseInline;w.parse;x.lex;const Rt=`# Magic Solo — User Guide

Play *Magic: The Gathering* alone in your browser: official **Challenge Decks**, **Archenemy** schemes, **Automaton** duels, plus classic deck browsing, set gallery, print proxies, and optional AI help.

**Live site:** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

中文版：[用户指南](./USER_GUIDE.zh.md)

---

## Contents

1. [Getting started](#1-getting-started)
2. [Play modes](#2-play-modes)
3. [Digital Play](#3-digital-play)
4. [Game Assistant](#4-game-assistant)
5. [Classic decks](#5-classic-decks)
6. [Set gallery](#6-set-gallery)
7. [Pack open, single draw & collection](#7-pack-open-single-draw--collection)
8. [Print assistant](#8-print-assistant)
9. [Card editor](#9-card-editor)
10. [AI Assistant](#10-ai-assistant)
11. [Notes & attribution](#11-notes--attribution)

Maintainer detail for Digital Play coverage: [Challenge implementation status](./CHALLENGE_IMPLEMENTATION.en.md).  
PC game-feel roadmap: [Game Feel Roadmap](./GAME_FEEL_ROADMAP.en.md).

---

## 1. Getting started

### Quick start

1. Open the **home page** and pick a mode under **Challenge Decks** or **More solo modes**.
2. On a deck page, choose **Digital Play** for the full solo board, or **Paper Play** for the challenge half-board at your table.
3. In Digital Play setup, pick a player list (and mode-specific options), then **Begin**.
4. Need rules? Open **Help** in the footer or read the deck’s rules panel before you start.

### Language

Use the header language switch for **English** or **中文**. Challenge Deck cards have no official Chinese printings; Chinese UI uses Magic Simplified Chinese terminology where needed.

### Navigation

| Control | Where | What it does |
| --- | --- | --- |
| Brand / logo | Header | Home (\`/\`) |
| **Play** | Header | Jump to any deck hub (\`/decks/:code\`) |
| Classic decks / Sets | Header | Browse archetypes and Scryfall sets |
| Card editor | Header | Grayed out while in development (see [§9](#9-card-editor)) |
| Pack open / Single draw | Header | Local pack and random-card toys; collect from those flows |
| Language | Header | English ↔ 中文 |
| Floating buttons | Right gutter | Up one level (some pages), back to top; after an AI key: settings + **Page chat** |
| Footer **Help** | Bottom | Open this guide in-app (\`/help\`; follows UI language) |
| Footer **References** | Bottom | Official-source / rules reference modal |
| Footer **Sound** | Bottom | Sound toggle; UI/game volume; visual quality; cinema mode |
| Footer **AI Assistant** | Bottom | Open optional AI API settings |
| Footer **Chat** | Bottom | **Page chat** (only after a key is saved) |

Without an AI API key, the site works fully; AI entry points stay hidden except the small footer link used to configure a key.

**Browse scrolling:** Lobby and deck pages scroll inside a fixed viewport (scrollbar hidden; use the mouse wheel, or click-and-drag on empty areas). The site footer follows page content and scrolls with it—it is not pinned to the bottom of the viewport. The right-side floating button goes **back one level** or to top.

**PC shortcuts:** \`?\` opens Help; \`Esc\` closes dialogs. Digital Play: \`Space\`/\`E\` primary, \`T\` end turn, \`F\` fullscreen. Physical Play: \`D\` draw, \`S\` shuffle, \`Ctrl+Z\` undo, \`F\` fullscreen.

---

## 2. Play modes

### Challenge Decks (official)

| Deck | Code | Expansion |
| --- | --- | --- |
| Face the Hydra | \`tfth\` | *Theros* |
| Battle the Horde | \`tbth\` | *Born of the Gods* |
| Defeat a God | \`tdag\` | *Journey into Nyx* |

Self-running Theros Game Day decks. Each has its own win condition and turn rhythm.

### More solo modes

| Mode | Code | Summary |
| --- | --- | --- |
| Archenemy | \`archenemy\` | Pick a villain theme (20 schemes + official 60-card villain AI); reveal a scheme each turn; reduce the Archenemy to 0 life |
| Automaton | \`automaton\` | Your curated list vs a computer list — full turns on both sides |
| Garruk the Slayer | \`ppc1\` | M15 Prerelease challenge: go first vs oversized Garruk (20 loyalty); cut loyalty to 0 before his Wolves drop you |

These use the same **Digital Play** board and UI as the Challenge Decks.

### Home (\`/\`)

- Hero preview of three Challenge Deck cards (drag to rearrange; resets on refresh)
- **New here?** shortcuts to Digital Play, classic decks, set gallery, and this guide
- Two lists: **Challenge Decks** and **More solo modes**

### Deck page (\`/decks/:setCode\`)

- Rules summary (expandable sections)
- Full card gallery (open a card for art, oracle text, quantity)
- Links to **Digital Play** and **Paper Play**
- **Print assistant** for the deck catalog (see [§8](#8-print-assistant))
- Use the header **Play** menu to switch modes

---

## 3. Digital Play

Route: \`/challenge/:setCode\`

A solo board with a curated player list plus an automated opponent half. Aims for faithful Challenge-style loops where implemented; **not** a full Arena / arbitrary-deck engine.

### Setup

1. **Difficulty / options**
   - Hydra: starting Heads **1–4**
   - Horde: delay **2–4** turns before the Horde advances
   - Archenemy: pick a **villain theme** (four 2010 packs + Nicol Bolas; each shows art and a short blurb), starting life **20–60** (default 40); Nicol Bolas mode can optionally use an **official Gatewatch list** (hides the curated player-deck picker when selected)
   - God / Automaton: no difficulty slider (Automaton picks an opponent list instead)
   - Garruk (\`ppc1\`): fixed **20** loyalty; no Hero’s Path; you always go first
2. Optional **Hero’s Path** heroes (up to **2** vs Hydra, **3** vs other modes that allow heroes; **none** vs Garruk)
3. Choose a player list (see below)
4. Preview the roster, then begin (optional setup AI advice when configured)

### Player lists

| Id | Name | Colors / role |
| --- | --- | --- |
| \`wildfire\` | Wildfire Host | RG midrange + Domri |
| \`terror\` | UB Terror | UB tempo + Liliana |
| \`burn\` | Ember Barrage | R aggro / burn + Chandra |
| \`skies\` | Azure Skies | WU flyers + removal + Jace |
| \`merfolk\` | Pearl Trident | U tribal tempo / lords + Kiora |
| \`akroan\` | Akroan Legion | WR soldiers (first strike) + Elspeth |
| \`nessian\` | Nessian Wilds | G beasts (reach / trample) + Nissa |
| \`humans\` | Parish Host | W Human tribal + Gideon |
| \`spirits\` | Spectral Chorus | WU Spirit flyers + Teferi |
| \`jund\` | Bloodbraid Barrens | BRG midrange + Vraska |

Only **implemented** card abilities fire in Digital Play. Some cards carry honest notes when the engine approximates printed text.

### During play

- Hand, lands, creatures, enchantments/artifacts, planeswalkers, and the opponent half-board; permanents on both halves share a **lane grid** so columns line up (cells reserve room for tap rotation and attack lean)
- Card art is warmed before play; **Begin** stays disabled until the cache is ready so faces do not pop in after you enter
- Warm prioritizes hand/board **normal** faces; hover preview (**png**) may still fetch on first open
- Opening **mulligan** (London rule); discard to 7 at end of turn when over hand size
- Challenge Decks: reveal → limited **stack** (pass / Wanderer counter / Fog / bounce Unsummon / flash creature) → resolve after your end step
- **Archenemy**: one scheme at the **start** of each of your turns; attack the Archenemy life total directly; after your end step the villain plays lands, casts in a heuristic loop, and may attack (**you assign blockers**). Optional **LLM opponent** (saved Chat Completion key; falls back to heuristic). **70** unique schemes in the catalog (OARC 45 + Nicol Bolas 20 + five DCI promos); each theme uses an official 20-card list. Villain uses **official 60-card theme lists** (MTGJSON); Nicol Bolas mode can swap in official Gatewatch hero lists (Gideon / Chandra / Nissa — Simplified Chinese card text in zh UI). Selecting an official Gatewatch list hides the curated player-deck section below. Resolved non-ongoing schemes recycle to the bottom of the scheme deck. Ongoing schemes stay in play with upkeep/end-step triggers and abandon when their printed conditions are met (e.g. Know Evil limits you to one spell per turn; Bow to My Command blocks power 3+ attackers). In Chinese UI, scheme names and rules use localized text (machine-translated where no official printing exists).
- **Automaton**: after your end step the opponent acts heuristically — land → loop affordable creatures/removal/enchantments → declare attackers (**you may block**). Same optional **LLM opponent**. You may attack its creatures or life. See the deck page “How to Play” for details
- **Garruk the Slayer**: after your end step he activates one loyalty ability then Wolves attack (blockable); optional LLM only affects ability choice
- Declare attackers, assign targets, combat (first-strike → normal damage)
- Coach tips, battle log, settlement screen

For an arbitrary paper deck, use the [Game Assistant](#4-game-assistant) instead.

**Implementation inventory**: [CHALLENGE_IMPLEMENTATION.en.md](./CHALLENGE_IMPLEMENTATION.en.md).

---

## 4. Game Assistant (Paper Play)

Route: \`/assistant/:setCode\`

**Paper Play** mode: digital **challenge half-board** while you play a physical deck at the table. No turn automation. Header/footer chrome is hidden on the play surface.

### Setup

- **Blank library** — full shuffle
- **Rules setup** — official starting permanents (e.g. Heads)

### Controls

- Click library to blind-draw (move the staging card before drawing again)
- Drag cards between library, battlefield, graveyard, exile
- Right-click or long-press: tap, ±damage, ±P/T, notes, zone moves
- Double-click library: search / reorder / play
- Named **player values** (e.g. life)
- Collapsible **Challenge procedure** checklist (no AI required)
- **Reset** returns to setup
- Return to the deck hub or use header **Play** to open another mode
- With AI configured: **Suggest next step** from the board + challenge rules (clears when the board changes)

---

## 5. Classic decks

Routes: \`/classic-decks\`, \`/classic-decks/:id\`

Curated constructed archetypes (dozens of lists across formats) with bilingual summary, how-it-wins text, sample list, and Scryfall-backed card art. Open cards from the list for details. On a deck detail page, **Print assistant** exports the full sample list (main + side) with each row’s **qty** expanded into separate faces (see [§8](#8-print-assistant)). With AI configured, use the classic-deck assist for deeper overview or comparisons.

---

## 6. Set gallery

Routes: \`/sets\`, \`/sets/:code\`

Browse Magic sets from Scryfall (filter by type, year, search), then open a set’s card gallery (search / rarity filters). Card data is fetched live from Scryfall. With AI configured, tick **AI** on the search field to turn natural language into a filter or Scryfall query.

**Print assistant** on a set page exports **all** cards in that set as a PDF (see [§8](#8-print-assistant)).

---

## 7. Pack open, single draw & collection

Header shortcuts:

| Feature | What it does |
| --- | --- |
| **Pack open** | Weighted 3-card “booster” reveal; after details show, use header **Collect** (left of Collection) |
| **Single draw** | One random card flip; same header text link to collect |
| **Collection cabinet** | Opened from pack / single-draw flows: save cards locally, filter/sort, import / export JSON, clear; **Print assistant**; **Collection advice** when AI is on |

Collection is stored in **this browser only** (\`localStorage\`). It is not synced across devices.

---

## 8. Print assistant

Client-side PDF export for cutting physical-size proxies. Opens from:

| Where | What gets printed |
| --- | --- |
| Challenge deck page (\`/decks/:code\`) | All cards in that challenge catalog, **expanded by quantity** (e.g. ×4 prints four faces) |
| Classic deck detail (\`/classic-decks/:id\`) | Full sample list (main + side), **expanded by each row’s qty** |
| Set gallery (\`/sets/:code\`) | Every card in the set (paginates Scryfall until complete; one face per unique print) |
| Collection cabinet | Every card currently saved in the local collection |

### Paper & layout

| Option | Page size (portrait base) | Layout |
| --- | --- | --- |
| **A4** | 210×297 mm | Auto cols/rows from margins, spacing, and card size; picks portrait or landscape |
| **A3** | 297×420 mm | Same |
| **B4** | 257×364 mm | Same |
| **Letter** | 215.9×279.4 mm | Same |
| **6″ photo** | 102×152 mm (4R) | Same (usually one card per page) |

Default card size is standard MTG **63×88 mm** with **1 mm bleed** (art extends slightly past cut marks for easier trimming). Advanced settings expose width/height (defaulting to 63×88), margins, spacing, bleed, fill empty slots, and **flush cut**. Default **7 mm** paper margins and **0** card gap, centered grid, with **cut marks**. In the modal you can edit quantities, remove cards, and reorder. Front faces only (no automatic backs / double-faced backs).

When printing, use **Actual size / 100%** — **Fit to page** shrinks every card. After export you can **Print** in the browser, **Save** the PDF, or **Share** when the OS supports it.

Images for on-screen preview use Scryfall **normal** (~488×680 JPEG); the exported PDF embeds Scryfall **png** (~745×1040). The modal shows load progress and a live preview of the sheet layout. Paper/layout prefs persist locally; the card list does not.

Large sets take longer (especially 6″ mode). Work stays in the browser; nothing is uploaded to a print server.

---

## 9. Card editor

Route: \`/editor\`

A visual Magic-style card face compositor (frames, art, bilingual text, PNG / JSON export, print hand-off, Scryfall import) is **under development**.

**Current status:** unavailable in the live UI.

- The header **Card Editor** control is grayed out and not clickable.
- Opening \`/editor\` directly shows the **404** page (same as other unknown paths).
- When ready to ship, maintainers can flip \`CARD_EDITOR_ENABLED\` in [\`src/features.ts\`](../src/features.ts).

---

## 10. AI Assistant

Optional. The site never ships a shared API key. You bring your own OpenAI-compatible endpoint.

### Enable AI

1. Open **AI Assistant** in the site footer (or the key button in the floating nav after a key is saved).
2. Enter:
   - **API base URL** (e.g. \`https://api.openai.com/v1\` or a CORS-friendly proxy)
   - **API key**
   - **Model** name
3. Save, then optionally **Test connection**.

**Important:** Most official APIs block browser CORS. Use an endpoint that allows browser calls, or your own proxy. The key stays in this browser and is sent only to the URL you enter.

With no key configured, layouts and gameplay match the non-AI site (AI feature chrome is not shown).

### Where AI appears (only after a key is set)

| Area | Capabilities |
| --- | --- |
| **Page chat** | Route-aware Q&A from footer **Chat** or floating nav; uses a short page brief + visible cards |
| **Card details** (decks, sets, pack, collection) | Plain explanation, keywords, ask a question, terminology (ZH UI), collection synergy |
| **Deck rules** | “Explain in 30 seconds”, free-form rules Q&A |
| **Challenge setup** | Advice for difficulty / heroes / deck choice |
| **Challenge play** | Board-aware coach tips (when Tips are on) |
| **Settlement** | Battle report (+ regenerate), ask about the match |
| **Game Assistant** | “Suggest next step” from board + challenge rules |
| **Classic deck detail** | Deeper overview, compare with another archetype |
| **Sets / set gallery** | Optional **AI** on the shared search field → filter or Scryfall query (+ card results in gallery) |
| **Collection cabinet** | Whole-collection advice (same row as export / import / clear) |

### Caching

Stable answers (card text, rules, archetypes, same question, etc.) are **cached on this device** with no expiry, keyed by content + model/API base. Changing model or base URL uses a separate cache. Clear cache from AI settings. **Regenerate battle report** forces a fresh request.

### Limits

- AI does **not** replace the game rules engine or auto-play turns.
- Answers are grounded in data the site sends (card JSON, rules JSON, board snapshot, page brief) plus a short official keyword gloss when relevant. Challenge rules override full Comprehensive Rules when they conflict. Answers can still be wrong—prefer [Wizards Rules](https://magic.wizards.com/en/rules) / printed oracle when it matters.
- You pay your provider for usage; caching reduces repeat cost.

---

## 11. Notes & attribution

- Card data and images © Wizards of the Coast; served via [Scryfall](https://scryfall.com).
- Challenge rules adapted from [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) and official Game Day materials.
- Fan project — **not affiliated with Wizards of the Coast**.

For local development and contributing, see the repository [README](../README.md).
`,Pt=`# Magic Solo — 用户指南

在浏览器里**一个人玩万智牌**：官方**挑战套牌**、**魔王**（邪计）、**自动机**，以及经典构筑浏览、系列图鉴、打印代理与可选 AI 帮助。

**线上地址：** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

English: [User Guide](./USER_GUIDE.en.md)

---

## 目录

1. [入门](#1-入门)
2. [对战模式](#2-对战模式)
3. [数字对战](#3-数字对战)
4. [游戏助手](#4-游戏助手)
5. [经典构筑](#5-经典构筑)
6. [系列图鉴](#6-系列图鉴)
7. [开包、单抽与收藏](#7-开包单抽与收藏)
8. [打印助手](#8-打印助手)
9. [卡牌编辑器](#9-卡牌编辑器)
10. [AI 助手](#10-ai-助手)
11. [说明与致谢](#11-说明与致谢)

维护向数字对战覆盖说明：[挑战实现情况](./CHALLENGE_IMPLEMENTATION.zh.md)。  
PC 端质感升级路线图：[游戏质感路线图](./GAME_FEEL_ROADMAP.zh.md)。

---

## 1. 入门

### 快速上手

1. 打开**首页**，在「挑战套牌」或「更多单人模式」中选一种。
2. 在套牌页选 **数字对战**（完整棋盘）或 **实体对局**（桌上跑挑战半场）。
3. 数字对战设置里选玩家牌表（及模式选项），点 **开始**。
4. 需要规则？看页脚 **帮助**，或开局前阅读套牌页规则摘要。

### 语言

通过页眉语言开关切换 **English** / **中文**。挑战套牌卡没有官方中文印制；中文界面尽量使用万智牌简体术语。

### 导航

| 控件 | 位置 | 作用 |
| --- | --- | --- |
| 品牌 / Logo | 页眉 | 回首页（\`/\`） |
| **对战** | 页眉 | 跳转到任一套牌页（\`/decks/:code\`） |
| 经典构筑 / 系列 | 页眉 | 浏览构筑原型与 Scryfall 系列 |
| 卡牌编辑器 | 页眉 | 开发中，灰显不可点（见 [§9](#9-卡牌编辑器)） |
| 开包 / 单抽 | 页眉 | 本地开包与随机抽卡；在对应流程中收藏 |
| 语言 | 页眉 | English ↔ 中文 |
| 浮动按钮 | 右侧 | 部分页面返回上级、回到顶部；已保存 AI 密钥后还有设置与 **页面对话** |
| 页脚 **帮助** | 底部 | 站内打开本指南（\`/help\`，随界面语言切换） |
| 页脚 **参考资料** | 底部 | 官方来源 / 规则参考弹窗 |
| 页脚 **音效** | 底部 | 开关音效、界面/游戏音量、画质档位、影院模式 |
| 页脚 **AI 助手** | 底部 | 打开可选的 AI 设置 |
| 页脚 **对话** | 底部 | **页面对话**（仅在已保存密钥后显示） |

未配置 API Key 时，站点功能完整可用；除用于填 Key 的页脚入口外，不会露出 AI 功能区。

**浏览滚动：** 大厅/套牌等内容在固定视口内滚动（滚动条隐藏；可用滚轮，或在空白处按住拖动）。页脚跟在页面内容之后，随内容滚动，不会固定贴在视口底边。右侧浮动按钮可 **返回上一层** 或回到顶部。

**快捷键（PC）：** \`?\` 打开帮助；\`Esc\` 关闭对话框。数字对战：\`Space\`/\`E\` 主行动、\`T\` 结束回合、\`F\` 全屏。实体对局：\`D\` 抽牌、\`S\` 洗牌、\`Ctrl+Z\` 撤销、\`F\` 全屏。

---

## 2. 对战模式

### 挑战套牌（官方）

| 套牌 | 代码 | 系列 |
| --- | --- | --- |
| 勇战多头龙 | \`tfth\` | 《Theros》 |
| 勇战蛮群 | \`tbth\` | 《Born of the Gods》 |
| 勇战天神 | \`tdag\` | 《Journey into Nyx》 |

Theros Game Day 官方三套自运行套牌，各有胜负条件与回合节奏。

### 更多单人模式

| 模式 | 代码 | 简介 |
| --- | --- | --- |
| 魔王赛制 | \`archenemy\` | 选择首领主题（20 张邪计 + 官方 60 张首领 AI 构组）；每回合开始时结算邪计；将魔王生命降至 0 |
| 自动机 | \`automaton\` | 你的精选牌表 vs 电脑牌表，双方完整回合 |
| 屠戮者加鲁克 | \`ppc1\` | 万智牌 2015 预发布挑战：先手对抗超大鹏洛客（20 忠诚）；在狼潮压垮你之前将其忠诚降至 0 |

与挑战套牌共用同一套**数字对战**棋盘与界面。

### 首页（\`/\`）

- 封面展示三套挑战套牌预览卡（可拖动；刷新后恢复默认）
- **从这里开始**：数字对战、经典构筑、系列图鉴、本指南
- 两个列表：**挑战套牌** 与 **更多单人模式**

### 套牌页（\`/decks/:setCode\`）

- 规则摘要（可展开章节）
- 完整卡牌图鉴
- **数字对战** / **实体对局** 入口
- **打印助手**（见 [§8](#8-打印助手)）
- 页眉 **对战** 菜单可切换模式

---

## 3. 数字对战

路径：\`/challenge/:setCode\`

精选玩家牌表 + 自动运行的对手半场。在已实现范围内尽量贴近官方挑战流程；**不是**完整 Arena / 任意构筑引擎。

### 开局设置

1. **难度 / 选项**
   - 多头龙：初始头颅 **1–4**
   - 蛮群：部落推进前延迟 **2–4** 回合
   - 魔王：选择**首领主题**（2010 四套 + 波拉斯；各主题有插图与简介），起始生命 **20–60**（默认 40）；波拉斯模式可选**守护者官方构组**（选官方构组后无需再选下方精选牌表）
   - 天神 / 自动机：无难度滑条（自动机需选对手牌表）
   - 屠戮者加鲁克（\`ppc1\`）：固定 **20** 忠诚；无英雄之路；你永远先手
2. 可选 **英雄之路** 英雄（对多头最多 **2** 个，其余允许英雄的模式最多 **3** 个；加鲁克模式无英雄）
3. 选择玩家牌表（见下表）
4. 预览牌表后开始（已配置 AI 时可选用开局建议）

### 玩家牌表

| Id | 名称 | 颜色 / 定位 |
| --- | --- | --- |
| \`wildfire\` | Wildfire Host（野火大军） | 红绿中速 + Domri |
| \`terror\` | UB Terror | 蓝黑节奏 + Liliana |
| \`burn\` | Ember Barrage（焦炎齐射） | 红色快攻 / 直伤 + Chandra |
| \`skies\` | Azure Skies（苍穹飞攻） | 白蓝飞行 + Jace |
| \`merfolk\` | Pearl Trident（珍珠三叉戟） | 蓝人鱼节奏 + Kiora |
| \`akroan\` | Akroan Legion（阿喀洛斯军团） | 红白士兵 + Elspeth |
| \`nessian\` | Nessian Wilds（涅西恩荒野） | 绿色野兽 + Nissa |
| \`humans\` | Parish Host（教区人海） | 白色人类部族 + Gideon |
| \`spirits\` | Spectral Chorus（幽影合唱） | 白蓝精怪 + Teferi |
| \`jund\` | Bloodbraid Barrens（血辫荒原） | 黑红绿中速 + Vraska |

数字对战仅 **已实现** 的异能会生效；部分牌面有诚实注记。

### 对局中

- 手牌、地、生物、结界/神器、鹏洛客与对手半场；双方战场卡牌按**共享车道**网格对齐（横置与进攻突出预留格内空间）
- 开局前会预热卡图；**开始**在资源就绪后才可点，避免进局后卡图慢慢弹出
- 预热优先手牌/战场用的 **normal** 面；悬停大图（png）仍可能首次按需加载
- 开局 **再调度**（伦敦规则）；结束回合手牌超过 7 先弃至 7
- 挑战套牌：揭示 → **有限堆叠**（让过 / 陵墓游灵 / 浓雾 / 弹回瞬间 / 闪现生物）→ 你的结束步后结算
- **魔王**：每个你的回合**开始时**发动邪计；可直攻魔王生命；你的结束步后首领会下地、循环施放并攻击（启发式 AI，攻击时**你可阻挡**）。开局可选用 **LLM 对手**（需已配置 Chat Completion；失败回退启发式）。邪计 **目录共 70 张**（OARC 45 + 波拉斯 20 + 5 张 DCI 促销）；各主题使用官方 20 张牌表。首领使用 **MTGJSON 官方 60 张主题构组**；波拉斯模式可换用守护者官方构组（基定 / 茜卓 / 妮莎，牌名与规则文本为简中译文）。选官方守护者构组时，下方精选玩家牌表会自动隐藏。非长效邪计结算后回牌堆底；长效邪计留场并触发维持/结束步效果，满足条件时可被撤废（如《识恶》每回合限一张咒语、《听我号令》禁止力量 3+ 生物攻击）。中文界面下邪计名称与规则文本为本地化译文（无官方印刷时使用机翻术语）。
- **自动机**：你的结束步后对手按启发式行动——下地 → 循环施放可支付的生物/解场/结界 → 宣告攻击（**你可阻挡**）。同样支持可选 **LLM 对手**。你可攻击其生物或生命。详见牌组页「玩法说明」
- **屠戮者加鲁克**：结束步后启动一条忠诚异能并令狼攻击（可挡）；可选 LLM 仅影响异能选择。
- 宣告攻击、指定目标、战斗（先攻 → 普通伤害）
- 教练提示、战报日志、胜负结算

若要使用任意纸牌构筑，请用 [游戏助手](#4-游戏助手)。

**实现清单**：[CHALLENGE_IMPLEMENTATION.zh.md](./CHALLENGE_IMPLEMENTATION.zh.md)。

---

## 4. 游戏助手（实体对局）

路径：\`/assistant/:setCode\`

**实体对局**模式：线下用实体牌、线上只跑 **挑战半场**。无自动回合。对局界面会隐藏页眉 / 页脚。

### 设置

- **空白牌库** — 整副洗匀
- **规则开局** — 按官方放置起始永久物（如多头）

### 操作

- 点击牌库暗抽（先移走暂存区的牌再抽下一张）
- 在牌库 / 战场 / 坟场 / 放逐间拖拽
- 右键或长按：横置、±伤害、±P/T、备注、区域移动
- 双击牌库：检索 / 调整顺序 / 取出
- 自定义 **玩家数值**（如生命）
- 可折叠 **挑战流程** 清单（不依赖 AI）
- **重置** 回到设置页
- 返回套牌页或用页眉 **对战** 菜单打开另一模式
- 已配置 AI 时：可根据场面与规则 **建议下一步**（场面变化后会清空）

---

## 5. 经典构筑

路径：\`/classic-decks\`、\`/classic-decks/:id\`

精选构筑原型（跨赛制数十套）：双语简介、「如何取胜」、示例牌表，以及基于 Scryfall 的卡图。可从列表打开卡牌详情。详情页提供 **打印助手**，会按示例牌表（主牌库 + 备牌）的 **qty** 展开张数后导出 PDF（见 [§8](#8-打印助手)）。已配置 AI 时可使用经典构筑助手做深入讲解或对比。

---

## 6. 系列图鉴

路径：\`/sets\`、\`/sets/:code\`

浏览 Scryfall 系列（按类型、年份、搜索过滤），进入单系列卡牌图鉴（搜索 / 稀有度）。卡牌数据实时从 Scryfall 拉取。已配置 AI 时，可在搜索框勾选 **AI**，用自然语言生成过滤词或 Scryfall 查询。

系列图鉴页提供 **打印助手**，可拉取该系列**全部**卡牌并导出 PDF（见 [§8](#8-打印助手)）。

---

## 7. 开包、单抽与收藏

页眉入口：

| 功能 | 说明 |
| --- | --- |
| **开包** | 加权 3 张「补充包」揭晓动画；详情露出后，可点页眉 **收藏**（在「收藏柜」左侧） |
| **单抽** | 单张随机翻开；同样用页眉文字链收藏 |
| **收藏柜** | 从开包 / 单抽流程进入：本地收藏、筛选排序、导入 / 导出 JSON、清空；**打印助手**；已配置 AI 时可点「收藏建议」 |

收藏仅存在 **本浏览器**（\`localStorage\`），不会跨设备同步。

---

## 8. 打印助手

在浏览器内生成可裁切的实体卡尺寸 PDF，入口：

| 位置 | 打印范围 |
| --- | --- |
| 挑战套牌页（\`/decks/:code\`） | 该挑战目录全部卡牌，并按 **quantity 展开张数**（如 ×4 会印 4 张） |
| 经典构筑详情（\`/classic-decks/:id\`） | 示例牌表主牌库 + 备牌，并按每行 **qty 展开** |
| 系列图鉴（\`/sets/:code\`） | 该系列全部卡牌（自动分页拉完 Scryfall；每种印刷一张） |
| 收藏柜 | 当前本地收藏中的全部卡牌 |

### 纸张与排布

| 选项 | 纸张尺寸（竖向基准） | 排布 |
| --- | --- | --- |
| **A4** | 210×297 mm | 按边距 / 间距 / 卡尺寸自动计算行列，并择优横或竖 |
| **A3** | 297×420 mm | 同上 |
| **B4** | 257×364 mm | 同上 |
| **Letter** | 215.9×279.4 mm | 同上 |
| **6 寸相纸** | 102×152 mm（4R） | 同上（通常每页 1 张） |

默认卡面为标准万智牌 **63×88 mm**，并默认 **1 mm 出血**（图略超出裁切线，方便裁切）。高级设置中可直接改宽高、边距、间距、出血、末页空位填充、贴边裁切等（宽高默认即为 63×88）。默认纸张边距 **7 mm**、卡间距 **0**，网格居中；带 **裁切线**。弹窗内可调整每张卡的数量、删除与排序。默认只印正面（不自动印背面 / 双面卡背面）。

打印 PDF 时请选 **实际大小 / 100%**——若用「适合页面」，整页会被缩小。导出后可选择 **打印**（浏览器）、**保存** PDF，或在支持时 **分享**。

预览卡图使用 Scryfall **normal**（约 488×680 JPEG）；导出 PDF 时再拉取 **png**（约 745×1040）。弹窗会显示加载进度与纸张预览（布局与最终 PDF 一致）。纸张与排版偏好会记在本机；清单本身不持久化。

大系列耗时更长（尤其 6 寸模式）。全程在浏览器完成，不会上传到打印服务器。

---

## 9. 卡牌编辑器

路径：\`/editor\`

可视化万智牌风格制卡（框体、插画、双语文本、PNG / JSON 导出、接入打印、Scryfall 导入）仍在 **开发中**。

**当前状态：** 线上不可用。

- 页眉 **卡牌编辑器** 灰显且不可点击。
- 直接访问 \`/editor\` 会进入 **404** 页面（与其它未知路径相同）。
- 开放时由维护者将 [\`src/features.ts\`](../src/features.ts) 中的 \`CARD_EDITOR_ENABLED\` 设为 \`true\`。

---

## 10. AI 助手

可选功能。站点不提供公共 API Key，需自备兼容 OpenAI Chat Completions 的端点。

### 如何开启

1. 点击页脚 **AI 助手**（保存 Key 后，浮动栏也会出现钥匙按钮）。
2. 填写：
   - **API 根地址**（如 \`https://api.openai.com/v1\`，或支持浏览器 CORS 的代理）
   - **API 密钥**
   - **模型**名称
3. 保存，可选用 **测试连接**。

**注意：** 多数官方 API 禁止浏览器直连（CORS）。请使用允许浏览器调用的端点或自建代理。密钥只保存在本机，并仅发往你填写的地址。

未配置 Key 时，界面与玩法与接入 AI 前一致（不显示 AI 功能块）。

### AI 出现在哪里（仅在已填 Key 后）

| 区域 | 能力 |
| --- | --- |
| **页面对话** | 页脚 **对话** 或浮动栏入口；按当前路由注入页面摘要与可见卡牌的问答 |
| **卡牌详情**（套牌 / 系列 / 开包 / 收藏） | 白话解释、关键字、提问、术语对照（中文界面）、收藏协同 |
| **套牌规则** | 「30 秒讲清」、自由规则问答 |
| **挑战开局** | 难度 / 英雄 / 牌组选择建议 |
| **挑战对局** | 局面感知教练提示（需打开 Tips） |
| **结算** | 战报（可再生成）、对本局提问 |
| **游戏助手** | 根据场面与规则「建议下一步」 |
| **经典构筑详情** | 深入讲解、与另一套对比 |
| **系列 / 图鉴** | 搜索框可勾选 AI：自然语言 → 系列过滤或 Scryfall 查询（图鉴可出卡结果） |
| **收藏柜** | 整柜收藏建议（与导出 / 导入 / 清空同一行） |

### 缓存

稳定回答（卡牌说明、规则、构筑讲解、相同提问等）会 **永久缓存在本机**，按内容 + 模型 / API 地址区分。更换模型或地址会使用另一套缓存。可在 AI 设置中清除。点 **重新生成战报** 会强制重新请求。

### 局限

- AI **不会**替代规则引擎，也不会自动操作回合。
- 回答优先依据站点注入的数据（卡牌 JSON、规则 JSON、局面快照、页面摘要）以及内置的官方关键字简释；挑战规则与完整规则冲突时以本站规则为准。仍可能出错，有疑义时以 [威世智规则页](https://magic.wizards.com/en/rules) / 牌张叙述为准。
- 调用费用由你的服务商结算；缓存可减少重复请求。

---

## 11. 说明与致谢

- 卡牌数据与图像 © 威世智；经由 [Scryfall](https://scryfall.com) 提供。
- 挑战规则整理自 [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) 及官方 Game Day 材料。
- 粉丝项目 — **与威世智无关**。

本地开发与贡献说明见仓库 [README](../README.md)。
`,Ct="https://github.com/kyle-ip/magic-solo/blob/main/README.md";function It(n){return n.trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M} -]/gu,"").replace(/ /g,"-")}f.use({gfm:!0,breaks:!1,renderer:{heading({tokens:n,depth:e}){const t=this.parser.parseInline(n),s=n.map(i=>"text"in i&&typeof i.text=="string"?i.text:"").join(""),r=It(s||t.replace(/<[^>]+>/g,""));return`<h${e} id="${r}">${t}</h${e}>
`},link({href:n,title:e,tokens:t}){const s=this.parser.parseInline(t);let r=n||"";r.endsWith("USER_GUIDE.zh.md")?r="#lang-zh":r.endsWith("USER_GUIDE.en.md")?r="#lang-en":(r==="../README.md"||r.endsWith("/README.md"))&&(r=Ct);const i=e?` title="${e}"`:"",l=/^https?:\/\//i.test(r)?' target="_blank" rel="noreferrer"':"";return`<a href="${r}"${i}${l}>${s}</a>`}}});function vt(){const{i18n:n}=Re(),e=n.language.startsWith("zh"),t=Pe.useMemo(()=>{const r=e?Pt:Rt;return f.parse(r,{async:!1})},[e]),s=r=>{const i=r.target.closest("a");if(!i)return;const l=i.getAttribute("href");if(l==="#lang-zh"){r.preventDefault(),n.changeLanguage("zh");return}l==="#lang-en"&&(r.preventDefault(),n.changeLanguage("en"))};return F.jsx("main",{className:"page help-page",children:F.jsx(Ce,{className:"help-page-section",children:F.jsx("article",{className:"help-article",onClick:s,dangerouslySetInnerHTML:{__html:t}})})})}export{vt as HelpPage};
