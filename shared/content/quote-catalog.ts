import data from "./data/prose/english_quotes.json";
import { quoteLengthOf } from "./quote-length";

export const quoteCatalog = data.quotes.map(quote => ({ ...quote, category: quoteLengthOf(quote.text) }));
