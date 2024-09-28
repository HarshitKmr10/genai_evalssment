"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var generative_ai_1 = require("@google/generative-ai");
var dotenv = require("dotenv");
dotenv.config({ path: '.env.local' });
var genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
function highlightText(_a) {
    var text = _a.text, keywords = _a.keywords;
    keywords.forEach(function (keyword) {
        var regex = new RegExp(keyword, 'gi');
        text = text.replace(regex, function (match) { return "\u001B[33m".concat(match, "\u001B[0m"); });
    });
    return text;
}
var highlightTextFunctionDeclaration = {
    name: "highlightText",
    description: "Highlight specific keywords in a given text.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            text: {
                type: generative_ai_1.SchemaType.STRING,
                description: "The input text to highlight within."
            },
            keywords: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: {
                    type: generative_ai_1.SchemaType.STRING
                },
                description: "List of keywords to highlight."
            }
        },
        required: ["text", "keywords"]
    }
};
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var model, chat, prompt_1, result, functionCalls, functions_1, functionResponses, result2, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    model = genAI.getGenerativeModel({
                        model: "gemini-1.5-flash",
                        tools: [
                            {
                                functionDeclarations: [highlightTextFunctionDeclaration]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.1,
                            topK: 1,
                            topP: 1,
                            maxOutputTokens: 2048,
                        }
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    chat = model.startChat();
                    prompt_1 = "You are implementing a program to use as your calendar. We can add a new event if adding the event will not cause a double booking.\n\n    A double booking happens when two events have some non-empty intersection (i.e., some moment is common to both events.).\n\n    The event can be represented as a pair of integers start and end that represents a booking on the half-open interval [start, end), the range of real numbers x such that start <= x < end.\n\n    Implement the MyCalendar class:\n\n    MyCalendar() Initializes the calendar object.\n    boolean book(int start, int end) Returns true if the event can be added to the calendar successfully without causing a double booking. Otherwise, return false and do not add the event to the calendar.\n    \n    Highlight the important terms in this problem statement.";
                    return [4 /*yield*/, chat.sendMessage(prompt_1)];
                case 2:
                    result = _a.sent();
                    functionCalls = result.response.functionCalls();
                    functions_1 = {
                        highlightText: highlightText
                    };
                    if (!(functionCalls && functionCalls.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, Promise.all(functionCalls.map(function (call) { return __awaiter(_this, void 0, void 0, function () {
                            var apiResponse;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, functions_1[call.name](call.args)];
                                    case 1:
                                        apiResponse = _a.sent();
                                        console.log("Highlighted Text:", apiResponse);
                                        return [2 /*return*/, {
                                                functionResponse: {
                                                    name: call.name,
                                                    response: {
                                                        content: apiResponse
                                                    }
                                                }
                                            }];
                                }
                            });
                        }); }))];
                case 3:
                    functionResponses = _a.sent();
                    return [4 /*yield*/, chat.sendMessage(functionResponses)];
                case 4:
                    result2 = _a.sent();
                    console.log(result2.response.text());
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('Error handling query:', error_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
main();
