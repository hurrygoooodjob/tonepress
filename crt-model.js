(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const radians = angle => angle * Math.PI / 180;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const subtract = (a,b) => a.map((value,i) => value - b[i]);
  const dot = (a,b) => a.reduce((sum,value,i) => sum + value*b[i], 0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => {
    const length = Math.hypot(...a) || 1;
    return a.map(value => value / length);
  };

  const vertexSource = `
    attribute vec3 aPosition, aNormal, aColor;
    attribute vec2 aUv, aMaterial;
    uniform mat4 uViewProjection;
    varying vec3 vPosition, vNormal, vColor;
    varying vec2 vUv, vMaterial;
    void main() {
      vPosition = aPosition;
      vNormal = aNormal;
      vColor = aColor;
      vUv = aUv;
      vMaterial = aMaterial;
      gl_Position = uViewProjection * vec4(aPosition, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    uniform sampler2D uArt;
    uniform vec3 uEye;
    uniform vec2 uViewport;
    varying vec3 vPosition, vNormal, vColor;
    varying vec2 vUv, vMaterial;
    void main() {
      if (vMaterial.y < -.5) {
        vec2 p = vPosition.xz;
        vec2 q = abs(p-vec2(.25,-.38))-vec2(1.38,.76);
        float distance = length(max(q,vec2(0.0))) + min(max(q.x,q.y),0.0);
        float soft = .175*(1.0-smoothstep(-.28,1.25,distance));
        float frontFeet = length(vec2((abs(p.x)-1.56)*2.7,(p.y-.75)*5.6));
        float rearFeet = length(vec2((abs(p.x)-1.25)*2.6,(p.y+.88)*5.4));
        float contact = .22*(1.0-smoothstep(0.0,1.3,min(frontFeet,rearFeet)));
        vec2 border = min(gl_FragCoord.xy,uViewport-gl_FragCoord.xy)/uViewport;
        float fade = smoothstep(.025,.13,border.y)*smoothstep(.024,.10,border.x);
        float opacity = (soft+contact)*smoothstep(-1.30,.28,uEye.y)*fade;
        gl_FragColor = vec4(.153,.166,.126,opacity);
        return;
      }
      vec3 normal = normalize(vNormal);
      vec3 view = normalize(uEye - vPosition);
      vec3 key = normalize(vec3(-.62, .82, .75));
      vec3 fill = normalize(vec3(.75, .16, .82));
      vec3 rim = normalize(vec3(.56, .69, -.65));
      float diffuse = max(0.0, dot(normal,key));
      float fillLight = max(0.0, dot(normal,fill));
      float rimLight = max(0.0, dot(normal,rim));
      float sheen = pow(max(0.0, dot(normal,normalize(key+view))), 33.0);
      float fillSheen = pow(max(0.0, dot(normal,normalize(fill+view))), 48.0);
      float grain = fract(sin(dot(vPosition, vec3(42.13,182.91,71.43)))*971.53)-.5;
      float gloss = vMaterial.x;
      vec3 tint = vec3(.52,.52,.51) + diffuse*vec3(.49,.44,.37) +
        fillLight*vec3(.11,.12,.137) + rimLight*vec3(.16,.175,.20);
      tint *= 1.0 - max(0.0,normal.x)*.085;
      vec3 shaded = vColor * (tint + grain*.017);
      shaded += sheen * gloss * vec3(.18,.155,.125) + fillSheen*gloss*vec3(.085,.092,.10);
      float fresnel = pow(1.0 - max(0.0,dot(normal,view)),3.0);
      shaded += gloss*fresnel*.052;
      if (vMaterial.y > 1.5) {
        shaded += vColor * .52;
      } else if (vMaterial.y > .5) {
        vec2 p = vUv * 2.0 - 1.0;
        vec3 image = texture2D(uArt,vUv).rgb;
        float edge = pow(max(abs(p.x),abs(p.y)),5.0);
        float corners = pow(length(p) / 1.414,4.0);
        float glassFalloff = 1.0 - .26*edge - .15*corners;
        float softbox = exp(-9.0*pow(p.y-.57+.24*p.x, 2.0)-2.6*pow(p.x+.34, 2.0));
        float phosphor = max(0.0, image.g-image.r);
        vec3 glassTone = vec3(.008,.024,.016) * (1.0 + 1.5*edge);
        shaded = (image + glassTone + phosphor*vec3(.009,.026,.018)) * glassFalloff;
        shaded += softbox*vec3(.043,.058,.045) + fresnel*vec3(.10,.15,.13);
        shaded += min(1.0,phosphor*8.0)*grain*.007;
      }
      gl_FragColor = vec4(clamp(shaded,0.0,1.0),1.0);
    }
  `;

  function rounded(w, h, r, x = 0, y = 0, steps = 10) {
    const points = [];
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (w-r);
      const cy = (corner < 2 ? 1 : -1) * (h-r);
      for (let i = 0; i <= steps; i++) {
        const angle = (corner + i/steps)*Math.PI/2;
        const nx = Math.cos(angle), ny = Math.sin(angle);
        points.push({x: x+cx+r*nx, y: y+cy+r*ny, nx, ny});
      }
    }
    return points;
  }

  function makeMesh() {
    const vertices = [];
    const screenOutline = [];
    const framingPoints = [];
    const shell = [
      {z:-1.43,w:1.39,h:1.006,r:.205,y:.053,c:[.70,.658,.594]},
      {z:-1.397,w:1.49,h:1.08,r:.227,y:.044,c:[.76,.721,.667]},
      {z:-1.30,w:1.58,h:1.14,r:.243,y:.036,c:[.79,.755,.701]},
      {z:-1.03,w:1.77,h:1.21,r:.24,y:.014,c:[.83,.79,.735]},
      {z:-.72,w:1.94,h:1.28,r:.227,y:0,c:[.862,.824,.765]},
      {z:-.32,w:2.068,h:1.344,r:.222,y:-.018,c:[.894,.856,.800]},
      {z:-.02,w:2.11,h:1.368,r:.214,y:-.02,c:[.904,.866,.813]},
      {z:.13,w:2.116,h:1.371,r:.214,y:-.02,c:[.907,.87,.818]},
      {z:.54,w:2.117,h:1.371,r:.214,y:-.02,c:[.911,.875,.822]},
      {z:.551,w:2.112,h:1.366,r:.216,y:-.02,c:[.577,.539,.485]},
      {z:.569,w:2.113,h:1.368,r:.216,y:-.02,c:[.636,.597,.54]},
      {z:.58,w:2.117,h:1.371,r:.215,y:-.02,c:[.914,.880,.832]},
      {z:.77,w:2.113,h:1.367,r:.22,y:-.02,c:[.92,.885,.837]},
      {z:.9,w:2.09,h:1.347,r:.225,y:-.02,c:[.931,.902,.856]},
      {z:1.033,w:2.018,h:1.281,r:.226,y:-.02,c:[.94,.915,.871]},
      {z:1.076,w:1.944,h:1.204,r:.227,y:-.02,c:[.919,.886,.83]}
    ];
    const face = [
      {...shell[shell.length-1]},
      {z:1.086,w:1.886,h:1.069,r:.211,y:.134,c:[.876,.835,.768]},
      {z:1.073,w:1.868,h:1.043,r:.209,y:.161,c:[.936,.907,.850]},
      {z:1.047,w:1.854,h:1.024,r:.211,y:.172,c:[.565,.53,.477]}
    ];
    const bezel = [
      {z:1.048,w:1.854,h:1.024,r:.211,y:.172,c:[.090,.090,.083]},
      {z:1.071,w:1.828,h:1.008,r:.220,y:.178,c:[.178,.181,.166]},
      {z:1.072,w:1.801,h:.995,r:.220,y:.18,c:[.201,.204,.19]},
      {z:1.039,w:1.766,h:.972,r:.215,y:.184,c:[.077,.090,.078]},
      {z:.985,w:1.742,h:.949,r:.212,y:.184,c:[.039,.051,.041]},
      {z:.913,w:1.727,h:.938,r:.206,y:.184,c:[.019,.027,.021]},
      {z:.865,w:1.71,h:.92,r:.187,y:.184,c:[.016,.025,.019]}
    ];

    function vertex(position, normal, color, gloss, type = 0, uv = [0,0]) {
      return {position, normal, color, gloss, type, uv};
    }

    function triangle(...points) {
      for (const point of points) {
        vertices.push(...point.position, ...point.normal, ...point.color, ...point.uv, point.gloss, point.type);
      }
    }

    function connect(a,b) {
      for (let i = 0; i < a.length; i++) {
        const next = (i+1) % a.length;
        triangle(a[i],a[next],b[next]);
        triangle(a[i],b[next],b[i]);
      }
    }

    function fan(points, center) {
      for (let i = 0; i < points.length; i++) triangle(center,points[i],points[(i+1) % points.length]);
    }

    function loft(profile, gloss) {
      const rings = profile.map(({w,h,r,z,y}) => rounded(w,h,r,0,y).map(p => ({
        position:[p.x,p.y,z], edge:[p.nx,p.ny]
      })));
      const bodies = rings.map((ring,j) => ring.map(({position,edge},i) => {
        const depth = subtract(rings[Math.min(j+1,rings.length-1)][i].position,rings[Math.max(j-1,0)][i].position);
        const tangent = [-edge[1],edge[0],0];
        return vertex(position,unit(cross(tangent,depth)),profile[j].c,gloss);
      }));
      for (let i = 1; i < bodies.length; i++) connect(bodies[i-1],bodies[i]);
    }

    function facePlate(w,h,r,x,y,z,color,gloss = .18,direction = 1) {
      const normal = [0,0,direction];
      const points = rounded(w,h,r,x,y,7).map(p => vertex([p.x,p.y,z],normal,color,gloss));
      fan(points,vertex([x,y,z],normal,color,gloss));
    }

    const shadowCorners = [[-3.4,-2.7],[3.9,-2.7],[3.9,2.4],[-3.4,2.4]]
      .map(([x,z]) => vertex([x,-1.501,z],[0,1,0],[0,0,0],0,-1));
    triangle(shadowCorners[0],shadowCorners[1],shadowCorners[2]);
    triangle(shadowCorners[0],shadowCorners[2],shadowCorners[3]);

    loft(shell,.39);
    for (const {w,h,r,y,z} of shell) {
      for (const point of rounded(w,h,r,0,y,6)) framingPoints.push([point.x,point.y,z]);
    }
    framingPoints.push([1.65,-1.064,1.234],[1.38,-1.20,1.234],[0,.06,-1.468]);
    loft(face,.38);
    loft(bezel,.47);
    facePlate(1.719,.922,.194,0,.184,.864,[.025,.036,.028],.18);

    const rearNormal = [0,0,-1];
    const back = shell[0];
    fan(rounded(back.w,back.h,back.r,0,back.y).map(p => vertex([p.x,p.y,back.z],rearNormal,back.c,.2)),
      vertex([0,back.y,back.z],rearNormal,back.c,.2));

    function pointOnGlass(u,v) {
      const corner = Math.pow(Math.abs(u*v),14);
      const x = 1.692*u*(1-.092*corner);
      const y = .913*v*(1-.138*corner);
      const z = .901 + .149*(1-(u*u+v*v)*.49);
      return [x,y+.184,z];
    }

    function glassVertex(u,v) {
      const epsilon = .001;
      const across = subtract(pointOnGlass(u+epsilon,v),pointOnGlass(u-epsilon,v));
      const up = subtract(pointOnGlass(u,v+epsilon),pointOnGlass(u,v-epsilon));
      return vertex(pointOnGlass(u,v),unit(cross(across,up)),[0,0,0],.95,1,[(u+1)/2,(v+1)/2]);
    }

    const surface = [];
    const columns = 52, rows = 40;
    for (let y = 0; y <= rows; y++) {
      const row = [];
      for (let x = 0; x <= columns; x++) row.push(glassVertex(x/columns*2-1,y/rows*2-1));
      surface.push(row);
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        triangle(surface[y][x],surface[y][x+1],surface[y+1][x+1]);
        triangle(surface[y][x],surface[y+1][x+1],surface[y+1][x]);
      }
    }
    screenOutline.push(...surface[0].map(p=>p.position));
    for (let y=1; y<=rows; y++) screenOutline.push(surface[y][columns].position);
    for (let x=columns-1; x>=0; x--) screenOutline.push(surface[rows][x].position);
    for (let y=rows-1; y>0; y--) screenOutline.push(surface[y][0].position);

    function interpolateShell(z,axis) {
      const index = shell.findIndex(profile => profile.z >= z);
      if (index < 1) return shell[Math.max(0,index)][axis];
      const a = shell[index-1], b = shell[index];
      const t = (z-a.z)/(b.z-a.z);
      return a[axis]*(1-t)+b[axis]*t;
    }

    function sideSurface(side,z,y,offset) {
      return [side*(interpolateShell(z,"w")+offset),y,z];
    }

    function topSurface(x,z,offset) {
      return [x,interpolateShell(z,"h")+interpolateShell(z,"y")+offset,z];
    }

    function slottedSurface(x,y,w,h,r,map,normal,offset,color,gloss = .1) {
      const shape = rounded(w,h,r,x,y,6).map(p => vertex(map(p.x,p.y,offset),normal,color,gloss));
      fan(shape,vertex(map(x,y,offset),normal,color,gloss));
    }

    // Side openings cross the curved rear shell. A narrow triangle strip
    // follows its surface so the dark channel remains visible along the bend.
    function sideSlot(side,depth,height,w,h,r,offset,color,gloss = .1) {
      function row(local) {
        const z = depth+local;
        const offCenter = Math.max(0,Math.abs(local)-w+r);
        const half = h-r+Math.sqrt(Math.max(0,r*r-offCenter*offCenter));
        const slope = (interpolateShell(z+.003,"w")-interpolateShell(z-.003,"w"))/.006;
        const normal = unit([side,0,-slope]);
        return [-half,half].map(y => vertex(sideSurface(side,z,y+height,offset),normal,color,gloss));
      }
      const divisions = Math.ceil(w*100);
      let a = row(-w);
      for (let i = 1; i <= divisions; i++) {
        const b = row(w*(2*i/divisions-1));
        triangle(a[0],b[0],b[1]);
        triangle(a[0],b[1],a[1]);
        a = b;
      }
    }

    for (const side of [-1,1]) {
      for (let line = 0; line < 9; line++) {
        const y = .7-line*.112;
        sideSlot(side,-.1,y,.52,.031,.029,.012,[.66,.607,.518]);
        sideSlot(side,-.098,y+.004,.501,.016,.016,.015,[.135,.124,.098]);
        sideSlot(side,-.103,y-.017,.486,.004,.004,.017,[.926,.864,.752],.22);
      }
      sideSlot(side,-.49,-.64,.181,.072,.024,.008,[.767,.72,.632],.18);
      for (let line = 0; line < 3; line++) {
        sideSlot(side,-.49,-.611-line*.028,.133,.003,.003,.012,[.563,.522,.459]);
      }
    }

    for (let line = 0; line < 6; line++) {
      const z = -.405+line*.108;
      slottedSurface(.04,z,.647,.023,.022,topSurface,[0,1,-.05],.005,[.724,.683,.61]);
      slottedSurface(.04,z+.001,.626,.010,.010,topSurface,[0,1,-.05],.008,[.351,.324,.276]);
      slottedSurface(.04,z+.017,.609,.003,.003,topSurface,[0,1,-.05],.009,[.956,.907,.823],.24);
    }

    // Fascia ridges: dark channels with a thin molded edge that catches the upper light.
    facePlate(1.128,.143,.055,-.481,-1.064,1.093,[.814,.78,.715],.18);
    for (let line = 0; line < 5; line++) {
      const y = -1.157+line*.047;
      facePlate(1.062,.0145,.014,-.492,y,1.096,[.666,.641,.586],.26);
      facePlate(1.033,.008,.008,-.492,y+.002,1.101,[.179,.172,.149],.13);
      facePlate(1.019,.0027,.0026,-.492,y-.011,1.106,[.958,.92,.834],.29);
    }
    facePlate(.158,.131,.047,1.509,-1.065,1.095,[.639,.594,.521],.35);
    facePlate(.078,.056,.017,1.026,-1.075,1.096,[.468,.443,.384],.21);

    function dial(x,y,profile,gloss,type = 0,segments = 64) {
      const ring = (level,j) => Array.from({length:segments},(_,i) => {
        const angle = TAU*i/segments;
        const cx = Math.cos(angle), sy = Math.sin(angle);
        const from = profile[Math.max(0,j-1)], to = profile[Math.min(profile.length-1,j+1)];
        const edgeZ = to.z-from.z, edgeR = to.r-from.r;
        const groove = level.knurl && i % 2 === 1 ? .004 : 0;
        const p = [x+(level.r-groove)*cx,y+(level.r-groove)*sy,level.z];
        const n = unit([cx*edgeZ,sy*edgeZ,-edgeR]);
        const color = groove ? level.c.map(value=>value*.77) : level.c;
        return vertex(p,n,color,gloss,type);
      });
      const rings = profile.map(ring);
      for (let i = 1; i < rings.length; i++) connect(rings[i-1],rings[i]);
      const front = profile[profile.length-1];
      fan(rings[rings.length-1],vertex([x,y,front.z],[0,0,1],front.c,gloss,type));
    }

    dial(1.51,-1.064,[
      {r:.137,z:1.100,c:[.250,.225,.185]}, {r:.134,z:1.111,c:[.392,.376,.326]},
      {r:.126,z:1.122,c:[.51,.479,.418]}, {r:.123,z:1.134,c:[.445,.420,.36]},
      {r:.118,z:1.146,c:[.79,.758,.666],knurl:true}, {r:.114,z:1.206,c:[.862,.823,.734],knurl:true},
      {r:.105,z:1.226,c:[.91,.866,.782]}, {r:.086,z:1.231,c:[.747,.707,.620]},
      {r:.067,z:1.231,c:[.674,.641,.575]}, {r:.002,z:1.231,c:[.701,.668,.594]}
    ],.52);
    facePlate(.009,.023,.008,1.510,-.997,1.234,[.254,.266,.214],.17);
    dial(1.026,-1.075,[
      {r:.025,z:1.101,c:[.151,.204,.134]}, {r:.019,z:1.114,c:[.305,.506,.191]},
      {r:.013,z:1.119,c:[.545,.911,.349]}, {r:.002,z:1.12,c:[.709,.974,.465]}
    ],.6,2,24);

    function foot(x,z,upperHeight) {
      const perimeter = rounded(.276,.176,.103,x,z,8);
      const upper = perimeter.map(p => vertex([p.x,upperHeight,p.y],[p.nx,0,p.ny],[.272,.248,.217],.19));
      const lower = perimeter.map(p => vertex([p.x,-1.50,p.y],[p.nx,-.3,p.ny],[.185,.166,.144],.16));
      connect(upper,lower);
      fan(lower,vertex([x,-1.50,z],[0,-1,0],[.19,.17,.15],.13));
      framingPoints.push(...lower.map(point=>point.position));
    }
    for (const side of [-1,1]) {
      foot(side*1.56,.78,-1.26);
      foot(side*1.25,-.84,-1.19);
    }

    // Rear service panel, cooling channels, and recessed video/power sockets.
    function rearPlate(w,h,r,x,y,depth,color,gloss = .18) {
      facePlate(w,h,r,x,y,-1.43-depth,color,gloss,-1);
    }
    rearPlate(1.244,.861,.153,0,.053,.004,[.557,.518,.452]);
    rearPlate(1.226,.842,.147,0,.053,.014,[.728,.688,.618],.23);
    for (let line = 0; line < 11; line++) {
      const y = -.073+line*.067;
      rearPlate(.924,.023,.022,-.025,y,.019,[.462,.423,.363]);
      rearPlate(.902,.013,.012,-.025,y+.004,.021,[.099,.099,.083]);
    }
    rearPlate(.512,.190,.051,.517,-.494,.019,[.489,.449,.392]);
    rearPlate(.495,.169,.041,.517,-.494,.028,[.232,.212,.172]);
    rearPlate(.135,.087,.019,.786,-.494,.033,[.104,.099,.080]);
    rearPlate(.093,.045,.011,.786,-.494,.039,[.048,.047,.041]);
    for (const x of [.244,.383,.522]) {
      rearPlate(.050,.050,.049,x,-.494,.034,[.583,.508,.359],.45);
      rearPlate(.033,.033,.032,x,-.494,.038,[.074,.073,.059],.26);
    }
    rearPlate(.295,.124,.025,-.72,-.493,.019,[.526,.49,.415]);
    for (let line=0; line<4; line++) {
      rearPlate(.225,.005,.005,-.72,-.565+line*.042,.024,[.38,.339,.278],.06);
    }
    for (const x of [-1.088,1.088]) for (const y of [-.64,.73]) {
      rearPlate(.032,.032,.03,x,y,.022,[.274,.25,.201],.5);
      rearPlate(.019,.003,.003,x,y,.024,[.115,.102,.081]);
    }

    return {vertices:new Float32Array(vertices),screenOutline,framingPoints};
  }

  function camera(yaw,pitch,aspect,framingPoints) {
    const azimuth = radians(yaw), elevation = radians(pitch);
    const distance = 10.25;
    const target = [.035,-.055,.015];
    const eye = [
      target[0]+distance*Math.cos(elevation)*Math.sin(azimuth),
      target[1]+distance*Math.sin(elevation),
      target[2]+distance*Math.cos(elevation)*Math.cos(azimuth)
    ];
    const back = unit(subtract(eye,target));
    const right = unit(cross([0,1,0],back));
    const up = cross(back,right);
    const f = 1/(Math.tan(radians(21.45)/2)*Math.max(1,1.32/aspect));
    const zScale = (100+.1)/(.1-100), zOffset = (2*100*.1)/(.1-100);
    const matrix = new Float32Array(16);
    const positions = [...Array(3)].map((_,i) => [right[i],up[i],back[i]]);
    positions.push([-dot(right,eye),-dot(up,eye),-dot(back,eye)]);
    positions.forEach(([x,y,z],i) => {
      matrix.set([x*f/aspect,y*f,z*zScale+(i===3?zOffset:0),-z],4*i);
    });
    let left = Infinity, rightEdge = -Infinity, bottom = Infinity, top = -Infinity;
    for (const point of framingPoints) {
      const [x,y] = project(point,matrix);
      left = Math.min(left,x);
      rightEdge = Math.max(rightEdge,x);
      bottom = Math.min(bottom,y);
      top = Math.max(top,y);
    }
    const fit = Math.min(1,1.83/(rightEdge-left),1.77/(top-bottom));
    const offsetX = -(left+rightEdge)*.5*fit;
    const offsetY = .045-(bottom+top)*.5*fit;
    for (let i=0; i<16; i+=4) {
      matrix[i] = matrix[i]*fit + matrix[i+3]*offsetX;
      matrix[i+1] = matrix[i+1]*fit + matrix[i+3]*offsetY;
    }
    return {eye,matrix};
  }

  function project(point,matrix) {
    const [x,y,z] = point;
    const w = x*matrix[3]+y*matrix[7]+z*matrix[11]+matrix[15];
    return [
      (x*matrix[0]+y*matrix[4]+z*matrix[8]+matrix[12])/w,
      (x*matrix[1]+y*matrix[5]+z*matrix[9]+matrix[13])/w
    ];
  }

  function makeProgram(gl) {
    function compile(type,source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader,gl.COMPILE_STATUS)) return shader;
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error);
    }
    const vertex = compile(gl.VERTEX_SHADER,vertexSource);
    let fragment, program;
    try {
      fragment = compile(gl.FRAGMENT_SHADER,fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program,vertex);
      gl.attachShader(program,fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      return program;
    } catch(error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }

  let mesh;
  function create(canvas) {
    const gl = canvas.getContext("webgl", {
      alpha:true, antialias:true, depth:true, premultipliedAlpha:false, powerPreference:"low-power"
    });
    if (!gl) return null;

    let program, buffer, texture;
    try {
      program = makeProgram(gl);
      if (!mesh) mesh = makeMesh();
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
      gl.useProgram(program);
      const stride = 13*4;
      for (const [name,size,offset] of [["aPosition",3,0],["aNormal",3,3],["aColor",3,6],["aUv",2,9],["aMaterial",2,11]]) {
        const attribute = gl.getAttribLocation(program,name);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,stride,offset*4);
      }
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([5,31,18,255]));
      gl.uniform1i(gl.getUniformLocation(program,"uArt"),0);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0,0,0,0);
    } catch {
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      return null;
    }
    const viewProjection = gl.getUniformLocation(program,"uViewProjection");
    const eyeLocation = gl.getUniformLocation(program,"uEye");
    const viewportLocation = gl.getUniformLocation(program,"uViewport");
    const maxSize = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    let textureDirty = true;
    let mipStage;
    let mipContext;
    let previousYaw = 38, previousPitch = 16;
    let hitShape = [];
    let disposed = false;

    function draw(yaw, pitch) {
      if (disposed || gl.isContextLost()) return false;
      const cssWidth = canvas.clientWidth, cssHeight = canvas.clientHeight;
      if (!cssWidth || !cssHeight) return false;
      previousYaw = Number.isFinite(yaw) ? yaw % 360 : previousYaw;
      previousPitch = clamp(Number.isFinite(pitch)?pitch:previousPitch,-55,65);
      const ratio = Math.min(window.devicePixelRatio || 1,2,maxSize[0]/cssWidth,maxSize[1]/cssHeight);
      const width = Math.round(cssWidth*ratio), height = Math.round(cssHeight*ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (textureDirty) {
        const art = window.TonepressTubeArtwork?.make();
        if (art && art.width && art.height) {
          if (!mipStage) {
            mipStage = document.createElement("canvas");
            mipStage.width = 1024;
            mipStage.height = 512;
            mipContext = mipStage.getContext("2d",{alpha:false});
          }
          let source = art;
          if (mipContext) {
            mipContext.drawImage(art,0,0,mipStage.width,mipStage.height);
            source = mipStage;
          }
          gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
          if (source === mipStage) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
          }
          textureDirty = false;
        }
      }
      const {matrix,eye} = camera(previousYaw,previousPitch,width/height,mesh.framingPoints);
      gl.viewport(0,0,width,height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(viewProjection,false,matrix);
      gl.uniform3fv(eyeLocation,eye);
      gl.uniform2f(viewportLocation,width,height);
      if (eye[1] > -1.3) {
        gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES,0,6);
        gl.depthMask(true);
      }
      gl.drawArrays(gl.TRIANGLES,6,mesh.vertices.length/13-6);
      hitShape = eye[2] > 1.32 ? mesh.screenOutline.map(point=>project(point,matrix)) : [];
      return true;
    }

    function isScreenAt(clientX,clientY) {
      if (!hitShape.length || disposed || gl.isContextLost()) return false;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return false;
      const x = (clientX-bounds.left)/bounds.width*2-1;
      const y = 1-(clientY-bounds.top)/bounds.height*2;
      let inside = false;
      for (let i=0,j=hitShape.length-1; i<hitShape.length; j=i++) {
        const [ax,ay] = hitShape[i], [bx,by] = hitShape[j];
        if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
      }
      return inside;
    }

    function refreshTexture() {
      textureDirty = true;
      draw(previousYaw,previousPitch);
    }
    document.addEventListener("tonepress:tube-art",refreshTexture);

    function destroy() {
      if (disposed) return;
      disposed = true;
      hitShape = [];
      document.removeEventListener("tonepress:tube-art",refreshTexture);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    }
    return {draw,isScreenAt,destroy};
  }

  window.TonepressCRT = {create};
})();
