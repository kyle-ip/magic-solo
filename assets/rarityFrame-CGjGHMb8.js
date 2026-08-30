const a=new Set(["common","uncommon","rare","mythic","special","bonus"]);function e(o){const r=(o||"common").toLowerCase();return a.has(r)?`rarity-frame-${r}`:"rarity-frame-common"}export{e as r};
