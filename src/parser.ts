import { Parser } from "./parsers/baseParser.js";
import WoopreadParser from "./parsers/woopreadParser.js";

const ALL_PARSERS: Parser[] = [new WoopreadParser()];

export function findCorrectParser(url: string): Parser {
    return ALL_PARSERS.find((parser) => parser.matchUrl(url));
}
