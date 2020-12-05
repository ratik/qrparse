const fs = require('fs');
const Jimp = require('jimp');
const qr = require('jsqr');
const permutator = (inputArr) => {
  let result = [];

  const permute = (arr, m = []) => {
    if (arr.length === 0) {
      result.push(m)
    } else {
      for (let i = 0; i < arr.length; i++) {
        let curr = arr.slice();
        let next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next))
     }
   }
 }
 permute(inputArr)
 return result;
}

(async () => {
  const image = await Jimp.read('au.jpg');
  const data = {};
  const width= 64;
  const height= 64;
  const gap = 8;
  const rules = {
    tl: [{x: 0, y: 0}],
    tr: [{x: width*3, y: 0}],
    bl: [{x: 0, y: height*3}],
    br: [{x: width*3, y: height*3}],
    t: [{x: width, y: 0}, {x: width*2, y: 0}],
    b: [{x: width, y: height*3}, {x: width*2, y: height*3}],
    l: [{x: 0, y: height}, {x: 0, y: height*2}],
    r: [{x: width*3, y: height}, {x: width*3, y: height*2}],
    c: [{x: width, y: height}, {x: width*2, y: height},{x: width, y: height*2}, {x: width*2, y: height*2}],
  };


  const isWhite = async (d, startX, startY, wX, wY) => {
    let count = 0;
    const total = width*height/4;
    const part = await(await d.clone()).crop(startX, startY, wX, wY);
    for (let i = 0; i<total; i++) {
      const [r,g,b] = [part.bitmap.data[i*4], part.bitmap.data[i*4+1], part.bitmap.data[i*4+2]];
      if (r+g+b < 50) count++;
      if (count /total > 0.1) return false;
    }
    return true;
  }

  const detectType = async bitmap => {
    let type='';
    if (await isWhite(bitmap, 0, 0, width, Math.round(height/4))) type+='t';  
    if (await isWhite(bitmap, 0, Math.round(height*0.8), width, Math.round(height/4))) type+='b';  
    if (await isWhite(bitmap, 0, 0, Math.round(width/4), height)) type+='l';  
    if (await isWhite(bitmap, Math.floor(width*0.75), 0, Math.floor(width/4), height)) type+='r';  
    return type || 'c';
  }
  
  await image.crop(852, 68, 290, 290);
  for(let x = 0; x<4; x++) {
    for(let y = 0;  y<4; y++) {
      const segment = (await(await image.clone()).crop(x*width+x*gap,y*height+y*gap,width,height));
      const type = await detectType(segment);
      if(!data[type]) data[type] = [];
      data[type].push(segment);
    }
  }

  let err= 0;

  const recu = async (data, tmp, stack = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br']) => {
    const pos = stack.shift();
    const items = permutator(data[pos]);
    for (const one of items) {
      const f = await tmp.clone();
      for(const [index, rule] of Object.entries(rules[pos])) {
        await f.composite(one[index], rule.x, rule.y);
      }
      if (stack.length) {
        await recu(data,f,[...stack]);
      } else {
        try {
          const out = qr(f.bitmap.data, width*4, height*4);
          if (out) {
            console.log(out);
            process.exit();
          }
        } catch(e) {
          process.exit();
        }
      }
    }
  }

  await recu(data, await new Jimp(width*4, height*4));

})()
