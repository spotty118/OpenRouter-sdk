/**
 * Audio Routes
 *
 * API endpoints for audio transcription.
 */
import express from 'express';
import multer from 'multer';
import { OpenRouter } from '../../core/open-router.js';
import { OpenRouterError } from '../../errors/openrouter-error.js';
import { Logger } from '../../utils/logger.js';
const router = express.Router();
const logger = new Logger('info');
// Create a single instance of OpenRouter to reuse across routes
const getOpenRouter = (apiKey) => new OpenRouter({ apiKey });
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
    },
});
/**
 * Transcribe audio
 *
 * POST /api/v1/audio/transcriptions
 */
router.post('/transcriptions', upload.single('file'), async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: audio file is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Get other form fields
        const model = req.body.model;
        const language = req.body.language;
        const prompt = req.body.prompt;
        const responseFormat = req.body.response_format;
        const temperature = req.body.temperature ? parseFloat(req.body.temperature) : undefined;
        // Validate required fields
        if (!model) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: model is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Audio transcription request: model=${model}, file=${req.file.originalname}, size=${req.file.size} bytes`);
        // Prepare request options
        const options = {
            model,
            file: req.file.buffer // Pass the buffer directly as ArrayBuffer
        };
        if (language)
            options.language = language;
        if (prompt)
            options.prompt = prompt;
        if (responseFormat)
            options.response_format = responseFormat;
        if (temperature !== undefined)
            options.temperature = temperature;
        // Send request to OpenRouter
        const response = await openRouter.createTranscription(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Audio transcription error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred during audio transcription',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
/**
 * Transcribe audio from URL
 *
 * POST /api/v1/audio/transcriptions/url
 */
router.post('/transcriptions/url', async (req, res) => {
    try {
        const apiKey = req.app.locals.apiKey;
        const { url, model, language, prompt, response_format, temperature } = req.body;
        // Validate required fields
        if (!url) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: url is required',
                    type: 'invalid_request_error'
                }
            });
        }
        if (!model) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: model is required',
                    type: 'invalid_request_error'
                }
            });
        }
        // Initialize OpenRouter with the API key
        const openRouter = getOpenRouter(apiKey);
        // Log the request
        logger.info(`Audio transcription from URL request: model=${model}, url=${url}`);
        // Prepare request options
        const options = {
            model,
            file: url // Pass the URL as a string
        };
        if (language)
            options.language = language;
        if (prompt)
            options.prompt = prompt;
        if (response_format)
            options.response_format = response_format;
        if (temperature !== undefined)
            options.temperature = temperature;
        // Send request to OpenRouter
        const response = await openRouter.createTranscription(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Audio transcription from URL error: ${errorMessage}`, error);
        const statusCode = (error instanceof OpenRouterError) ? error.status : 500;
        res.status(statusCode).json({
            error: {
                message: errorMessage || 'An error occurred during audio transcription',
                type: error instanceof Error ? error.name : 'server_error',
                code: statusCode,
                data: (error instanceof OpenRouterError) ? error.data : null
            }
        });
    }
});
export default router;
//# sourceMappingURL=audio.js.map