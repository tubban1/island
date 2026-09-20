// Shared art direction for loaded assets: warm shore, bright reef, cool open water.
export const harbourPalette={
 'Warm lagoon sand':'#F8DDA6',
 'Sunlit sand':'#FFE6B5',
 'Island ground':'#E5D2A1',
 'Sun bleached plaster':'#FFF4DF',
 'Honey wood':'#D6A064',
 'Terracotta roof':'#DA864D',
 'Roof tile #BF925A':'#D98448',
 'Roof tile #D0A16C':'#EDA260',
 'Roof tile #AD8049':'#BC683D',
 'Roof tile #C89B63':'#E29351',
 'Coral pink':'#F098B9',
 'Flower pink':'#FF5681',
 'Flower magenta':'#DB397D',
 'Flower orange':'#FF8054',
 'Coral purple':'#B08ACB',
 'Coral aqua':'#42C6BA',
 'Coral cyan':'#52D5D8',
 'Coral mint':'#B0DFC0',
 'Coral yellow':'#F1DE8D',
 'Reef rock':'#9F9686',
 'Reef rock sandstone':'#C0AF94',
 'Reef rock slate':'#78818A',
 'Reef rock brown':'#968572',
 'Beach rock':'#BBB49A',
 'Submerged sand':'#ECDDB4',
 'Palm lime':'#BDD957',
 'Palm leaf':'#71B542',
 'Palm dark':'#368E48'
};
export function applyHarbourPalette(material){
 const color=harbourPalette[material.name];if(color)material.color.set(color);
}
