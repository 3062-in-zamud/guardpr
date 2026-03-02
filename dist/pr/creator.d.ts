import { PRComposition } from "./composer";
export declare class PRCreator {
    create(composition: PRComposition, config: {
        owner: string;
        repo: string;
        baseBranch: string;
        token: string;
    }): Promise<{
        url: string;
        number: number;
    } | null>;
}
//# sourceMappingURL=creator.d.ts.map