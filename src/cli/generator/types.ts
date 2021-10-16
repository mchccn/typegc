export type Constraint = ((value: any) => boolean | Error) & { ts: string; js: string; global: string };
export type Factory = ((...args: any[]) => Constraint) & { isFactory: true };
