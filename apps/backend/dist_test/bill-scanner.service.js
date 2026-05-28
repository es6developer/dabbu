"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillScannerService = void 0;
var common_1 = require("@nestjs/common");
var tesseract_js_1 = require("tesseract.js");
var sharp_1 = require("sharp");
var CATEGORY_KEYWORDS = [
    { keywords: ['restaurant', 'hotel', 'cafe', 'food', 'dining', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'tiffin', 'hotel', 'biryani', 'curry', 'snack'], category: 'Food & Dining' },
    { keywords: ['grocery', 'groceries', 'supermarket', 'mart', 'provisions', 'vegetables', 'fruits', 'milk', 'dairy', 'bakery', 'general store', 'kirana'], category: 'Groceries' },
    { keywords: ['petrol', 'diesel', 'fuel', 'service station', 'indian oil', 'hp', 'bharat petroleum', 'shell', 'parking', 'toll'], category: 'Transportation' },
    { keywords: ['electronics', 'clothing', 'apparel', 'footwear', 'mall', 'retail', 'superstore', 'departmental'], category: 'Shopping' },
    { keywords: ['electricity', 'water bill', 'gas bill', 'broadband', 'internet', 'telephone', 'recharge', 'utility'], category: 'Bills & Utilities' },
    { keywords: ['movie', 'cinema', 'netflix', 'game', 'entertainment', 'amusement', 'ticket'], category: 'Entertainment' },
    { keywords: ['hospital', 'doctor', 'clinic', 'pharmacy', 'medicine', 'medical', 'health', 'diagnostic', 'dentist', 'eye', 'consultation', 'consulting', 'registration', 'fees', 'fee', 'checkup', 'check up', 'lab', 'test', 'scan', 'xray', 'x-ray', 'mri', 'ecg', 'blood', 'urine', 'prescription', 'consultant', 'surgeon', 'patient', 'opd', 'ipd', 'ward', 'bed', 'nursing', 'injection', 'dressing', 'operation', 'surgery', 'theatre', 'pathology', 'radiology', 'sonography', 'ultrasound', 'vaccine', 'immunization', 'health check', 'package'], category: 'Healthcare' },
    { keywords: ['school', 'college', 'university', 'tuition', 'course', 'book', 'stationery', 'training'], category: 'Education' },
    { keywords: ['rent', 'lease', 'maintenance', 'society', 'apartment'], category: 'Rent' },
    { keywords: ['insurance', 'policy', 'premium'], category: 'Insurance' },
    { keywords: ['gym', 'fitness', 'yoga', 'sports'], category: 'Fitness' },
    { keywords: ['salon', 'spa', 'beauty', 'parlour'], category: 'Personal Care' },
    { keywords: ['jewellery', 'jewelry', 'gold', 'ornament'], category: 'Jewellery' },
];
var DATE_PATTERNS = [
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/,
    /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})\b/i,
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i,
    /\b(\d{1,2})[.](\d{1,2})[.](\d{4})\b/,
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/,
];
var MONTH_MAP = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
};
var CURRENCY_PATTERN = /(?:rs\.?\s*|inr\s*|₹\s*|\$\s*|total\s*:?\s*(?:rs\.?\s*|inr\s*|₹\s*)?)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.?\d{0,2})/i;
var BillScannerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BillScannerService = _classThis = /** @class */ (function () {
        function BillScannerService_1() {
            this.logger = new common_1.Logger(BillScannerService.name);
        }
        BillScannerService_1.prototype.scanBill = function (base64Image_1) {
            return __awaiter(this, arguments, void 0, function (base64Image, mimeType) {
                var imageData, imageBuffer, ext, processed, err_1, rawText, worker, psmModes, _i, psmModes_1, psm, data, text, words, cleaned, result;
                if (mimeType === void 0) { mimeType = 'image/jpeg'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            imageData = base64Image.startsWith('data:')
                                ? base64Image.split(',')[1]
                                : base64Image;
                            imageBuffer = Buffer.from(imageData, 'base64');
                            ext = this.mimeToExt(mimeType);
                            this.logger.log("Scanning bill image (".concat(Math.round(imageBuffer.length / 1024), " KB)"));
                            processed = imageBuffer;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, (0, sharp_1.default)(imageBuffer)
                                    .greyscale()
                                    .normalise()
                                    .median(1)
                                    .sharpen()
                                    .toBuffer()];
                        case 2:
                            processed = (_a.sent());
                            this.logger.log("Image preprocessed: ".concat(Math.round(processed.length / 1024), " KB"));
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            this.logger.warn('Image preprocessing failed, using original', err_1);
                            return [3 /*break*/, 4];
                        case 4:
                            rawText = '';
                            return [4 /*yield*/, (0, tesseract_js_1.createWorker)('eng', tesseract_js_1.OEM.DEFAULT, {
                                    logger: function (m) {
                                        if (m.status === 'recognizing text')
                                            return;
                                    },
                                })];
                        case 5:
                            worker = _a.sent();
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, , 12, 14]);
                            psmModes = [tesseract_js_1.PSM.AUTO, tesseract_js_1.PSM.SINGLE_BLOCK];
                            _i = 0, psmModes_1 = psmModes;
                            _a.label = 7;
                        case 7:
                            if (!(_i < psmModes_1.length)) return [3 /*break*/, 11];
                            psm = psmModes_1[_i];
                            return [4 /*yield*/, worker.setParameters({
                                    tessedit_pageseg_mode: psm,
                                })];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, worker.recognize(processed)];
                        case 9:
                            data = (_a.sent()).data;
                            text = data.text.trim();
                            words = text.split(/\s+/).filter(function (w) { return w.length > 0; });
                            this.logger.log("PSM ".concat(psm, ": ").concat(text.length, " chars, ").concat(words.length, " words"));
                            if (words.length > 3 && text.length > rawText.length) {
                                rawText = text;
                            }
                            _a.label = 10;
                        case 10:
                            _i++;
                            return [3 /*break*/, 7];
                        case 11: return [3 /*break*/, 14];
                        case 12: return [4 /*yield*/, worker.terminate()];
                        case 13:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 14:
                            rawText = rawText.trim();
                            if (!rawText) {
                                throw new common_1.BadRequestException('Could not read any text from the image. Try a clearer photo.');
                            }
                            this.logger.log("OCR extracted ".concat(rawText.length, " chars"));
                            cleaned = this.normalizeOcrText(rawText);
                            this.logger.log("After normalization: ".concat(cleaned.length, " chars"));
                            result = this.parseBillText(cleaned);
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        BillScannerService_1.prototype.normalizeOcrText = function (text) {
            var s = text;
            s = s.replace(/[^\x00-\x7F₹€£¥₩₽₨₦₡₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿\s.,;:!?'"()\[\]{}\-\\/@#$%&*+=0-9a-zA-Z]/g, '');
            s = s.replace(/[•·●]/g, ' ');
            s = s.replace(/[–—−]/g, '-');
            s = s.replace(/\|/g, ' ');
            s = s.replace(/(?<=\d)\s*[lI]\s*(?=\d)/g, '1');
            s = s.replace(/O\s*(?=\d)/g, '0');
            s = s.replace(/(?<=\d)\s*O\s*(?=\d)/g, '0');
            s = s.replace(/\\n/g, '\n');
            s = s.replace(/[^\S\n]{2,}/g, ' ');
            s = s.replace(/\n{3,}/g, '\n\n');
            s = s.replace(/\s*,\s*/g, ', ');
            var lines = s.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            return lines.join('\n');
        };
        BillScannerService_1.prototype.parseBillText = function (text) {
            var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            var merchant = this.extractMerchant(lines);
            var amount = this.extractAmount(text, lines);
            var date = this.extractDate(text);
            var items = this.extractItems(lines);
            var category = this.categorize(text);
            var description = items.length > 0
                ? items.slice(0, 3).map(function (i) { return i.name; }).join(', ')
                : merchant;
            var confidence = this.calculateConfidence(text, amount, merchant, date);
            return {
                amount: amount,
                merchant: merchant,
                date: date,
                description: description || merchant,
                category: category,
                items: items,
                confidence: confidence,
                rawText: text,
            };
        };
        BillScannerService_1.prototype.extractMerchant = function (lines) {
            var skipWords = ['gstin', 'gst', 'invoice', 'bill', 'receipt', 'tax', 'sale', 'cash', 'total', 'amount', 'date', 'phone', 'mobile', 'tel', 'www', 'http', 'email', 'address', 'store', 'shop', 'counter', 'terminal', 'order', 'table', 'server', 'cashier', 'payment', 'change', 'visa', 'mastercard', 'rupay', 'upi', 'card', 'credit', 'debit', 'saving', 'thank', 'have a nice'];
            var skipSet = new Set(skipWords);
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                var clean = line.replace(/[^a-zA-Z\s&.'-]/g, '').trim();
                if (clean.length >= 3 &&
                    clean.length <= 60 &&
                    !skipSet.has(clean.toLowerCase().split(/\s+/)[0]) &&
                    !/^\d/.test(clean) &&
                    !/^(?:www\.|http|\d{10,}|\d{6,})/i.test(clean) &&
                    !/gst|invoice|receipt|tax|total|amount|phone|www|http|visa|master|rupay|upi|cash/i.test(clean)) {
                    return clean;
                }
            }
            return 'Unknown Merchant';
        };
        BillScannerService_1.prototype.extractAmount = function (text, lines) {
            var totalLabels = ['total', 'grand total', 'amount', 'total amount', 'net amount', 'payable', 'amount due', 'bill amount', 'total due', 'net total', 'balance due', 'you pay', 'paid', 'charge', 'grand', 'subtotal', 'sub total'];
            var candidates = [];
            for (var _i = 0, totalLabels_1 = totalLabels; _i < totalLabels_1.length; _i++) {
                var label = totalLabels_1[_i];
                var regex = new RegExp("".concat(label, "\\s*:?\\s*(?:rs\\.?\\s*|inr\\s*|\u20B9\\s*)?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+\\.?\\d{0,2})"), 'i');
                var match = text.match(regex);
                if (match) {
                    var val = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(val) && val > 0 && val < 9999999 && !this.looksLikePhone(val)) {
                        candidates.push({ value: val, priority: 10, source: 'label' });
                    }
                }
            }
            for (var _a = 0, lines_2 = lines; _a < lines_2.length; _a++) {
                var line = lines_2[_a];
                var currencyMatch = line.match(CURRENCY_PATTERN);
                if (currencyMatch) {
                    var val = parseFloat(currencyMatch[1].replace(/,/g, ''));
                    if (!isNaN(val) && val > 0 && val < 9999999 && !this.looksLikePhone(val)) {
                        var isLastLine = line === lines[lines.length - 1];
                        var isInLastThird = lines.indexOf(line) >= lines.length * 0.66;
                        candidates.push({ value: val, priority: isLastLine ? 8 : isInLastThird ? 6 : 3, source: 'currency' });
                    }
                }
            }
            for (var _b = 0, lines_3 = lines; _b < lines_3.length; _b++) {
                var line = lines_3[_b];
                var numbers = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})/g);
                if (numbers) {
                    for (var _c = 0, numbers_1 = numbers; _c < numbers_1.length; _c++) {
                        var n = numbers_1[_c];
                        var val = parseFloat(n.replace(/,/g, ''));
                        if (!isNaN(val) && val >= 10 && val <= 999999 && !this.looksLikePhone(val)) {
                            var inLastThird = lines.indexOf(line) >= lines.length * 0.66;
                            candidates.push({ value: val, priority: inLastThird ? 4 : 1, source: 'number' });
                        }
                    }
                }
            }
            var items = this.extractItems(lines);
            if (items.length > 0) {
                var sumFromItems = items.reduce(function (s, it) { return s + (it.quantity || 1) * it.price; }, 0);
                candidates.push({ value: Math.round(sumFromItems * 100) / 100, priority: 12, source: 'items' });
            }
            candidates.sort(function (a, b) {
                if (b.priority !== a.priority)
                    return b.priority - a.priority;
                return Math.abs(b.value - 250) - Math.abs(a.value - 250);
            });
            return candidates.length > 0 ? candidates[0].value : 0;
        };
        BillScannerService_1.prototype.looksLikePhone = function (val) {
            var s = String(Math.round(val));
            return s.length >= 10 || (s.length === 6 && /^\d{6}$/.test(s));
        };
        BillScannerService_1.prototype.extractDate = function (text) {
            for (var _i = 0, DATE_PATTERNS_1 = DATE_PATTERNS; _i < DATE_PATTERNS_1.length; _i++) {
                var pattern = DATE_PATTERNS_1[_i];
                var match = text.match(pattern);
                if (match) {
                    if (match.length === 4 && /^\d+$/.test(match[3])) {
                        if (pattern.source.includes('YYYY') || pattern.source.includes('yyyy') || pattern.source.includes('\\d{4}.*\\d{1,2}.*\\d{1,2}')) {
                            var y_1 = parseInt(match[1]), m = parseInt(match[2]), d = parseInt(match[3]);
                            if (y_1 > 1900 && y_1 < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                                return "".concat(y_1, "-").concat(String(m).padStart(2, '0'), "-").concat(String(d).padStart(2, '0'));
                            }
                        }
                        var d2 = parseInt(match[1]), m2 = parseInt(match[2]), y = parseInt(match[3]);
                        if (y > 1900 && y < 2100 && m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31) {
                            return "".concat(y, "-").concat(String(m2).padStart(2, '0'), "-").concat(String(d2).padStart(2, '0'));
                        }
                    }
                    else if (match[2] && MONTH_MAP[match[2].toLowerCase().slice(0, 3)] !== undefined) {
                        var d = parseInt(match[1]), monthIdx = MONTH_MAP[match[2].toLowerCase().slice(0, 3)], y = parseInt(match[3]);
                        if (y > 1900 && y < 2100) {
                            return "".concat(y, "-").concat(String(monthIdx + 1).padStart(2, '0'), "-").concat(String(d).padStart(2, '0'));
                        }
                    }
                    else if (match[2] && MONTH_MAP[match[2].toLowerCase()] !== undefined) {
                        var d = parseInt(match[1]), monthIdx = MONTH_MAP[match[2].toLowerCase()], y = parseInt(match[3]);
                        if (y > 1900 && y < 2100) {
                            return "".concat(y, "-").concat(String(monthIdx + 1).padStart(2, '0'), "-").concat(String(d).padStart(2, '0'));
                        }
                    }
                }
            }
            return new Date().toISOString().split('T')[0];
        };
        BillScannerService_1.prototype.extractItems = function (lines) {
            var items = [];
            var skipLines = ['gstin', 'gst', 'invoice', 'bill', 'receipt', 'tax', 'total', 'amount',
                'cash', 'change', 'phone', 'mobile', 'tel', 'website', 'email', 'address', 'thank',
                'have a nice day', 'visit again', 'saved', 'card', 'credit', 'debit', 'upi', 'payment',
                'change due', 'round off', 'subtotal', 'item', 'qty', 'rate', 'price', 'description',
                'sub total', 'net amount', 'grand total', 'date', 'bill no', 'invoice no', 'order',
                'hsn', 'sac', 'mrp', 'cgst', 'sgst', 'igst', 'cess', 'discount', 'savings',
                'round up', 'round down', 'paid by', 'pay by', 'cashier', 'counter', 'sign',
            ];
            var priceEndRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.?\d{0,2})\s*$/;
            var priceAnywhere = /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
            var qtyRegex = /(?:^|\s)(\d+)\s*x\s*/;
            var _loop_1 = function (line) {
                var lower = line.toLowerCase().trim();
                if (skipLines.some(function (s) { return lower.startsWith(s) || lower === s; }))
                    return "continue";
                if (/^\d+$/.test(line.trim()))
                    return "continue";
                if (/\b(gst|invoice|receipt|tax total|sub total|grand total|net amount|round off|change due|hsn|sac|mrp|cgst|sgst|igst|discount|savings)\b/i.test(lower))
                    return "continue";
                var qty = void 0;
                var qtyMatch = line.match(qtyRegex);
                if (qtyMatch)
                    qty = parseInt(qtyMatch[1]);
                var endsWithPrice = line.match(priceEndRegex);
                var hasPriceAnywhere = line.match(priceAnywhere);
                var price = null;
                var namePart = line;
                if (endsWithPrice) {
                    price = parseFloat(endsWithPrice[1].replace(/,/g, ''));
                    namePart = line.slice(0, -endsWithPrice[0].length).trim();
                }
                else if (hasPriceAnywhere) {
                    price = parseFloat(hasPriceAnywhere[1].replace(/,/g, ''));
                    namePart = line.replace(hasPriceAnywhere[0], '').trim();
                }
                if (price && !isNaN(price) && price >= 1 && price <= 999999) {
                    var name_1 = namePart
                        .replace(/^\d+\s*x\s*/i, '')
                        .replace(/₹|Rs\.?|INR/i, '')
                        .replace(/[×xX]\s*\d+/g, '')
                        .replace(/@\s*\d+/g, '')
                        .trim();
                    name_1 = name_1.replace(/[|:;/\-]/g, ' ').replace(/\s+/g, ' ').trim();
                    if (name_1.length > 1 && name_1.length < 80 && !/^\d+$/.test(name_1)) {
                        items.push({ name: name_1, price: price, quantity: qty });
                    }
                }
            };
            for (var _i = 0, lines_4 = lines; _i < lines_4.length; _i++) {
                var line = lines_4[_i];
                _loop_1(line);
            }
            return items;
        };
        BillScannerService_1.prototype.categorize = function (text) {
            var lower = text.toLowerCase();
            var bestCategory = 'Other';
            var bestScore = 0;
            for (var _i = 0, CATEGORY_KEYWORDS_1 = CATEGORY_KEYWORDS; _i < CATEGORY_KEYWORDS_1.length; _i++) {
                var entry = CATEGORY_KEYWORDS_1[_i];
                var score = 0;
                for (var _a = 0, _b = entry.keywords; _a < _b.length; _a++) {
                    var kw = _b[_a];
                    var regex = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                    var matches = lower.match(regex);
                    if (matches) {
                        score += matches.length * 2;
                    }
                    else if (lower.includes(kw)) {
                        score += 1;
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestCategory = entry.category;
                }
            }
            return bestCategory;
        };
        BillScannerService_1.prototype.calculateConfidence = function (text, amount, merchant, date) {
            var score = 0;
            var factors = 4;
            if (amount > 0)
                score += 1;
            if (merchant && merchant !== 'Unknown Merchant')
                score += 1;
            if (date && date !== new Date().toISOString().split('T')[0])
                score += 1;
            if (text.length > 50)
                score += 1;
            var confidence = score / factors;
            if (text.length < 10)
                confidence *= 0.5;
            if (text.length < 3)
                confidence *= 0.3;
            if (/error|fail|unable/i.test(text))
                confidence *= 0.3;
            return Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100;
        };
        BillScannerService_1.prototype.mimeToExt = function (mime) {
            var map = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
                'image/bmp': 'bmp',
            };
            return map[mime] || 'jpg';
        };
        return BillScannerService_1;
    }());
    __setFunctionName(_classThis, "BillScannerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BillScannerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BillScannerService = _classThis;
}();
exports.BillScannerService = BillScannerService;
