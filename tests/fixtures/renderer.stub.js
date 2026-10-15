// DOM workflow tests replace GPU drawing only. Sailing/economy code stays real.
export class OceanRenderer {
  constructor(parent){if(window.__failOcean)throw new Error('WebGL unavailable');this.renderer={domElement:document.createElement('canvas')};parent.append(this.renderer.domElement);window.__ocean=this;}
  configure(){}
  setWaypoint(target){window.__waypoint=target;}
  feedback(event){(window.__effects||=[]).push(event);}
  project(){return {x:200,y:200,visible:true};}
  sync(state){window.__snapshot=state;}
  render(){}
  aim(){return 0;}
  aimAt(){return window.__aimIntent||{aim:0,target:null};}
  setTarget(id,status){window.__aimStatus={id,...status};}
  explosion(){}
}
export class ShipPreview {
  constructor(){this.renderer={domElement:document.createElement('canvas')};}
  attach(parent){parent.append(this.renderer.domElement);}
  render(){}
}
