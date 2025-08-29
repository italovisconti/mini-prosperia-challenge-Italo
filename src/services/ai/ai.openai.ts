import { logger } from '../../config/logger.js';
import { ParsedReceipt } from '../../types/receipt.js';
import { AiProvider } from './ai.interface.js';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logMethod } from '../../utils/logging/method.decorator.logger.js';
const prisma = new PrismaClient();

export class OpenAiProvider implements AiProvider {
  baseUrl: string;
  token: string;
  structurePrompt: string;
  categorizePrompt: string;

  constructor() {
    this.baseUrl = process.env.OPENAI_BASE_URL || 'http://localhost:8080';
    this.token = process.env.PROSPERIA_TOKEN || '';

    var defStructurePrompt = `You are an intelligent assistant that helps process invoices and receipts either in spanish or english.
            Your task is to analyze the text extracted by OCR (rawText) and return the relevant information in JSON format.
            Extract fields only if they are present.
            If any field is not present, use null or an empty list.
            Respond only with the JSON object, without any additional explanations.`;
    this.structurePrompt =
      process.env.OPENAI_STRUCTURE_PROMPT || defStructurePrompt;

    var defCategorizePrompt = `You are an intelligent assistant that helps categorize invoices and receipts either in spanish or english.
            Your task is to analyze the text extracted by OCR (rawText) and return the relevant information in JSON format.
            If any field is not present, use null or an empty list.
            Respond only with the JSON object, without any additional explanations.
            From the provided accounts, pick the best match and return only its numeric id in categoryId. If no match is found, return null.
            The provider name could be provided, if not, you need to check in the rawText hints about the vendor name and item names to find the best match.
            `;

    this.categorizePrompt =
      process.env.OPENAI_CATEGORIZE_PROMPT || defCategorizePrompt;
  }

  // TODO: Implementar extracción de información con IA del rawText
  @logMethod({ scope: "AI:OpenAI" })
  async structure(rawText: string) {
    const payload = {
      // Do not change the model. Only gpt-4o-mini works
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.structurePrompt },
        { role: 'user', content: rawText }
      ],
      temperature: 0.4,
      response_format: {
        // could use typescript-json-schema for this
        type: 'json_schema',
        json_schema: {
          name: 'invoice_extraction',
          strict: false,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              amount: {
                type: ['number', 'null'],
                description: 'Total amount of the invoice'
              },
              subtotalAmount: {
                type: ['number', 'null'],
                description: 'Subtotal amount before tax'
              },
              taxAmount: {
                type: ['number', 'null'],
                description: 'Total tax amount'
              },
              taxPercentage: {
                type: ['number', 'null'],
                description: 'Tax percentage applied'
              },
              type: { type: 'string', enum: ['expense', 'income'] },
              currency: {
                type: ['string', 'null'],
                description: 'ISO 4217 currency code, if not recognized default to USD'
              },
              date: {
                type: ['string', 'null'],
                description: 'Date in ISO-8601 format'
              },
              paymentMethod: {
                type: ['string', 'null'],
                enum: ['CARD', 'CASH', 'TRANSFER', 'OTHER', null]
              },
              description: {
                type: ['string', 'null'],
                description: 'Description of the invoice'
              },
              invoiceNumber: {
                type: ['string', 'null'],
                description: 'Invoice number'
              },
              vendorName: {
                type: ['string', 'null'],
                description: `Name of the vendor. Use title case (capitalize the first letter of each word). 
                  Due to OCR errors there may be extra or misplaced spaces inside or between words (for example 'Co mpany' or 'Com pany''). 
                  You may correct and normalize spaces and capitalization to return a readable, consistent name.
                  It can also happen that the OCR omits spaces between words (for example 'CompanyNameInc'); in those cases you may insert spaces where it makes sense to produce a natural vendor name.
                  Vendor names may be in Spanish or English and may include common legal suffixes such as "LLC", "S.A.", or "AC".`
              },
              vendorIdentifications: {
                type: ['array', 'null'],
                description:
                  'Array of vendor identification objects with type and value. These are legal identifiers and can change between countries. Examples are RUC, NIT, CIF, VAT, RIF, etc.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    type: { type: ['string', 'null'] },
                    value: { type: ['string', 'null'] }
                  }
                }
              }
            }
          }
        }
      }
    };

    let resp;
    try {
      resp = await axios.post(`${this.baseUrl}/openai/chat`, payload, {
        headers: { 'X-Prosperia-Token': this.token }
      });
    } catch (err: unknown) {
      logger.error(
        'OpenAI request failed: ' +
          (err instanceof Error ? err.message : String(err))
      );
      return {};
    }

    const responseContent = resp?.data?.choices?.[0]?.message?.content;
    let result: Partial<ParsedReceipt> = {};

    if (responseContent) {
      try {
        const parsed = JSON.parse(responseContent);
        result = parsed;

        if (!isDateFormatValid(result.date)) {
          logger.warn({ message: "Invalid date format detected", date: result.date });
          result.date = null;
        }

      } catch (err: unknown) {
        logger.error(
          'Failed to parse Structure OpenAI response: ' +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    return result;
  }

  // TODO: Implementar categorize con openAI para que retorne la categoria/cuenta
  // a la que la factura debería ir destinada
  @logMethod({ scope: "AI:OpenAI" })
  async categorize(input: { rawText: string; vendorName?: string; items?: ParsedReceipt['items']; }): Promise<Partial<ParsedReceipt>> {
    const accounts = await prisma.account.findMany();

    const allowedAccounts = accounts.map((a) => ({ id: a.id, name: a.name }));
    const allowedIds = allowedAccounts.map((a) => a.id);

    logger.info('Available accounts: ' + JSON.stringify(allowedAccounts));

    // If there are no accounts to choose from, bail early
    if (allowedIds.length === 0) {
      logger.warn('No accounts found for categorization');
      return {};
    }

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.categorizePrompt },
        {
          role: 'user',
          content: JSON.stringify({
            rawText: input.rawText,
            vendorName: input.vendorName || null,
            accounts: allowedAccounts,
          })
        }
      ],
      temperature: 0.5,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'invoice_categorization',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['category'],
            properties: {
              category: {
                type: 'integer',
                enum: allowedIds,
                description: 'ID of the chosen account. You must provide a valid account ID from the list.'
              }
            }
          }
        }
      }
    };

    let resp;
    try {
      resp = await axios.post(`${this.baseUrl}/openai/chat`, payload, {
        headers: { 'X-Prosperia-Token': this.token }
      });
    } catch (err: unknown) {
      logger.error(
        'Categorize OpenAI request failed: ' +
          (err instanceof Error ? err.message : String(err))
      );
      return {};
    }

    const responseContent = resp?.data?.choices?.[0]?.message?.content;
    let result: Partial<ParsedReceipt> = {};

    if (responseContent) {
      try {
        const parsed = JSON.parse(responseContent);
        result = parsed;
      } catch (err: unknown) {
        logger.error(
          'Failed to parse Structure OpenAI response: ' +
            (err instanceof Error ? err.message : String(err))
        );
        return {};
      }
    }

    return result;
  }
}

function isDateFormatValid(date: string | null | undefined): boolean {
  if (!date) return false;
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}