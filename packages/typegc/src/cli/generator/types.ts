export type Constraint = ((value: any) => boolean | Error) & { ts: string; js: string; global: string; dependencies: [string, Constraint[]][] };
export type Factory = ((...args: any[]) => Constraint) & { isFactory: true };
