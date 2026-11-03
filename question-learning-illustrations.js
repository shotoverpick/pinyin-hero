/* 项目原创 SVG 示意图；Minecraft 阅读使用自绘方块场景。 */
(() => {
const svg=(body,label)=>`<svg viewBox="0 0 160 130" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const cube=(x=34,y=33,c='#70bda0')=>`<path d="M${x} ${y+20}l42 -20 42 20 -42 21z" fill="${c}"/><path d="M${x} ${y+20}l42 21v49l-42 -22z" fill="#438c79"/><path d="M${x+42} ${y+41}l42 -21v48l-42 22z" fill="#94d4b4"/><path d="M${x} ${y+20}l42 -20 42 20v48l-42 22-42-22z M${x+42} ${y+41}v49 M${x} ${y+20}l42 21 42-21" fill="none" stroke="#336f64" stroke-width="2"/>`;
const car=(bus=false)=>`<rect x="8" y="104" width="144" height="5" rx="2" fill="#c9d9d8"/><path d="M19 82h122v21H19z" fill="#edaf55"/><path d="M36 49h71l22 33H22z" fill="#5ca6ca"/><path d="M43 55h26v23H30z M76 55h24l16 23H76z" fill="#d8f2fa"/><circle cx="43" cy="104" r="13" fill="#395464"/><circle cx="118" cy="104" r="13" fill="#395464"/><circle cx="43" cy="104" r="6" fill="#b6cbd4"/><circle cx="118" cy="104" r="6" fill="#b6cbd4"/>${bus?'<rect x="21" y="29" width="112" height="58" rx="5" fill="#edaf55"/><path d="M30 40h22v23H30z M61 40h22v23H61z M91 40h30v49H91z" fill="#d8f2fa"/>':''}`;
const tree=`<rect x="71" y="60" width="18" height="54" fill="#ad805c"/><path d="M28 73L80 7l52 66z" fill="#73b781"/><path d="M33 54L80 2l47 52z" fill="#91ca8e"/>`;
const house=`<rect x="35" y="49" width="90" height="69" fill="#c7a57a"/><path d="M20 50L80 9l60 41z" fill="#8b6958"/><rect x="48" y="67" width="25" height="24" fill="#a9dce3"/><path d="M60 67v24M48 79h25" stroke="#fff" stroke-width="3"/><rect x="88" y="73" width="24" height="45" fill="#765a4f"/>`;
const blockTree=`<rect x="70" y="66" width="20" height="56" fill="#886344"/><path d="M24 25h112v56H24z" fill="#68a65a"/><path d="M24 25h36v28H24z M96 53h40v28H96z M60 25h36v28H60z" fill="#82bb65"/>`;
const bodies={
 cube:cube(),cuboid:`<path d="M14 53l32-24 101 23-32 26z" fill="#e8bd7c"/><path d="M14 53l101 25v33L14 86z" fill="#c7925e"/><path d="M115 78l32-26v33l-32 26z" fill="#f0ce98"/>`,
 cylinder:`<path d="M42 37h76v65c0 24-76 24-76 0z" fill="#91bdd7"/><ellipse cx="80" cy="37" rx="38" ry="16" fill="#d1e9f5"/><path d="M42 101c0 22 76 22 76 0" fill="none" stroke="#5591b5" stroke-width="3"/>`,
 'cylinder-side':`<path d="M45 36h66v65H45z" fill="#83b8d5"/><ellipse cx="111" cy="68" rx="18" ry="33" fill="#c8e8f4"/><path d="M45 36c-28 0-28 65 0 65" fill="#5496bd"/>`,
 sphere:`<circle cx="80" cy="68" r="45" fill="#e9ac62"/><ellipse cx="68" cy="50" rx="21" ry="15" fill="#f8d7a1"/><path d="M49 95q36 29 64-15" fill="none" stroke="#cb8548" stroke-width="7" stroke-linecap="round"/>`,
 car:car(),bus:car(true),parking:car(),seat:`<path d="M47 20q-6 0-6 15v51l14 25h70V87H75V27z" fill="#83acd0"/><path d="M59 28l48 74" stroke="#4e626e" stroke-width="10"/><circle cx="90" cy="91" r="10" fill="#edaa62"/>`,
 tree,house,'pixel-house':house+`<path d="M35 72h90M35 95h90M56 49v69M80 49v69M103 49v69" stroke="#a48561" opacity=".5"/>`,
 'pixel-tree':blockTree,'grass-block':cube(34,33,'#82b760'),'pixel-path':`<path d="M20 114l72-95 48 14-72 95z" fill="#b5a47d"/>${blockTree.replaceAll('70','120').replaceAll('90','140')}`,
 'pixel-garden':`<rect x="12" y="80" width="136" height="42" fill="#8fba71"/>${[35,80,125].map((x)=>`<path d="M${x} 90V54" stroke="#4b8e64" stroke-width="5"/><rect x="${x-11}" y="43" width="23" height="23" fill="#eda8ae"/>`).join('')}`,
 pond:`<ellipse cx="80" cy="83" rx="72" ry="31" fill="#b2dfe5"/><ellipse cx="45" cy="65" rx="26" ry="11" fill="#83b783"/><ellipse cx="116" cy="74" rx="25" ry="11" fill="#83b783"/><path d="M50 94q18-18 40 0-22 18-40 0l-13-10v20z" fill="#edac70"/>`,
 'lotus-leaf':`<ellipse cx="80" cy="60" rx="59" ry="28" fill="#85b986"/><path d="M80 60v59 M80 60L30 50 M80 60l44-13 M80 60l-36 20 M80 60l34 22" stroke="#548e69" fill="none" stroke-width="3"/>`,
 snow:`<rect x="0" y="70" width="160" height="60" rx="20" fill="#e4f3fb"/><circle cx="80" cy="86" r="30" fill="#fff" stroke="#bad4e4"/><circle cx="80" cy="44" r="21" fill="#fff" stroke="#bad4e4"/><path d="M82 46l23 6-23 4z" fill="#eda966"/><circle cx="72" cy="40" r="2"/><circle cx="86" cy="40" r="2"/>`,
 book:`<path d="M10 30q35-13 70 0 35-13 70 0v79q-35-13-70 0-35-13-70 0z" fill="#a3ccdb"/><path d="M80 30v79" stroke="#5b8fa1" stroke-width="3"/><path d="M24 49h40M24 65h40M96 49h40M96 65h40" stroke="#eff8fb" stroke-width="5"/>`,
 pencil:`<path d="M42 95l67-67 16 16-67 67-28 12z" fill="#edbf68"/><path d="M42 95l16 16-28 12z" fill="#d2b5a0"/><path d="M109 28l9-9q7-6 16 5t-2 13l-7 7z" fill="#dea2a8"/>`,
 arrow:`<path d="M20 65h112m-30-25l30 25-30 25" fill="none" stroke="#72a994" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,
 card:`<rect x="22" y="15" width="116" height="103" rx="15" fill="#fff" stroke="#abc9bb" stroke-width="3"/><path d="M40 38h80M40 92h80" stroke="#e2ede6" stroke-width="3"/>`,
 compass:`<path d="M80 10v110M25 65h110" stroke="#7fa1ab" stroke-width="4"/><path d="M80 10l-8 15h16zM135 65l-15-8v16zM80 120l-8-15h16zM25 65l15-8v16z" fill="#7fa1ab"/>`,
 sequence:`<circle cx="40" cy="66" r="23" fill="#8ebda6"/><circle cx="120" cy="66" r="23" fill="#e7c180"/><path d="M68 66h24l-8-8m8 8-8 8" fill="none" stroke="#648d81" stroke-width="3"/>`,
 door:`<rect x="45" y="15" width="73" height="106" fill="#bf9c78"/><path d="M47 15l42 18v83l-42 5z" fill="#e1bd90"/><circle cx="78" cy="77" r="4" fill="#745d49"/>`
};
const aliases={'🚗':'car','🚙':'car','🚌':'bus','🧊':'cube','🏗️':'cuboid','🧩':'cube','book3d':'cuboid','plank':'cuboid','can':'cylinder','battery':'cylinder','rubik':'cube','leaves':'tree','birds':'tree','frog-cave':'house','footprints':'snow','seasons':'tree','scene':'house','children':'house','switch':'door','line':'arrow','check':'card','ear':'book','clock':'card'};
window.QuestionIllustrations={render(symbol){let key=aliases[symbol]||symbol;return bodies[key]?svg(bodies[key],symbol):`<span class="ql-emoji" aria-hidden="true">${symbol}</span>`;}};
})();
