// Approved winter-melon volume and two wraparound markings. All views and
// renderers use this geometry; no front/back sticker copies are maintained.
(() => {
  const constants=Object.freeze({sideRatio:.86,heartY:-2.65,stripeColor:'#F6A533'});
  const half=[[0,-7],[-.85,-6.88],[-1.8,-6.51],[-2.45,-5.76],[-2.85,-4.68],
    [-3.1,-3.55],[-3.2,-2.5],[-3.1,-1.65],[-2.8,-1.04],[-2.15,-.48],[-1.1,-.12],[0,0]];
  const anchors=[...half,...half.slice(1,-1).reverse().map(([x,y])=>[-x,y])];
  const contour=[];
  // Closed Catmull-Rom keeps the top and round bottom smooth and symmetric.
  for(let i=0;i<anchors.length;i++) {
    const n=anchors.length,p0=anchors[(i+n-1)%n],p1=anchors[i],p2=anchors[(i+1)%n],p3=anchors[(i+2)%n];
    for(let k=0;k<8;k++) {
      const t=k/8,t2=t*t,t3=t2*t;
      contour.push([0,1].map(d=>.5*(2*p1[d]+(p2[d]-p0[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t2+(3*p1[d]-p0[d]-3*p2[d]+p3[d])*t3)));
    }
  }
  const width=Math.max(...contour.map(p=>Math.abs(p[0])));
  function verticalSpan(x) {
    const ys=[];
    for(let i=0;i<contour.length;i++) {
      const a=contour[i],b=contour[(i+1)%contour.length];
      if(Math.abs(b[0]-a[0])>1e-9 && x>=Math.min(a[0],b[0]) && x<=Math.max(a[0],b[0]))
        ys.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
    }
    return [Math.min(...ys),Math.max(...ys)];
  }
  const surfaceArc=x=>-.25*(x/width)**2;
  const bands=[[-1.75,.40],[-.95,.34]].map(([center,thickness])=>{
    const upper=[],lower=[];
    for(let i=0;i<=256;i++) {
      const x=width*(i/128-1),[bodyTop,bodyBottom]=verticalSpan(x);
      const arc=surfaceArc(x);
      const top=Math.max(bodyTop,center+arc-thickness/2);
      const bottom=Math.min(bodyBottom,center+arc+thickness/2);
      if(bottom>=top){upper.push([x,top]);lower.push([x,bottom]);}
    }
    return [...upper,...lower.reverse()];
  });
  const scaled=(points,u)=>points.map(([x,y])=>[x*u,y*u]);
  const outline=(u=1)=>scaled(contour,u);
  const stripes=(u=1)=>bands.map(band=>scaled(band,u));
  const breadth=yaw=>Math.hypot(Math.cos(yaw),constants.sideRatio*Math.sin(yaw));
  function halfWidthAt(y) {
    let result=0;
    for(let i=0;i<contour.length;i++) {
      const a=contour[i],b=contour[(i+1)%contour.length];
      if(Math.abs(b[1]-a[1])>1e-9 && y>=Math.min(a[1],b[1]) && y<=Math.max(a[1],b[1]))
        result=Math.max(result,Math.abs(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1])));
    }
    return result;
  }
  // Keep the complete feature on the visible rounded surface while turning,
  // including its upper edge, where the head is narrower than at eye center.
  function fitEllipseX(x,y,rx,ry,yaw,margin=.08) {
    const scale=breadth(yaw);
    let limit=Infinity;
    for(let i=0;i<=24;i++) {
      const a=-Math.PI/2+i*Math.PI/24;
      limit=Math.min(limit,halfWidthAt(y+ry*Math.sin(a))*scale-rx*Math.cos(a)-margin);
    }
    limit=Math.max(0,limit);
    return Math.max(-limit,Math.min(limit,x));
  }
  globalThis.YayaBody=Object.freeze({outline,stripes,breadth,surfaceArc,fitEllipseX,constants});
})();
