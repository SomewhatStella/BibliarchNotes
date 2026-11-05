export type CloudBaseline={version:number;snapshot:string};
export function cloudOpenDecision(fresh:boolean,unchanged:boolean,local:string,remote:string,baseline:CloudBaseline|null,version:number):'load'|'save'|'conflict'{
 if(local===remote)return 'load';
 if(!unchanged)return 'conflict';
 if(fresh||baseline?.snapshot===local)return 'load';
 if(baseline?.version===version)return 'save';
 return 'conflict';
}
