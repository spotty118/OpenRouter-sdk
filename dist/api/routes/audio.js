/**
 * Audio Routes
 *
 * API endpoints for audio transcription.
 */
import express from 'express';
import multer from 'multer';
import { OpenRouter } from '../../core/open-router';
import { Logger } from '../../utils/logger';
const router = express.Router();
const logger = new Logger('info');
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
        files: 1
    }
});
/**
 * Transcribe audio to text
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
        // Get other parameters from request body
        const model = req.body.model;
        const language = req.body.language;
        const prompt = req.body.prompt;
        const response_format = req.body.response_format;
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Audio transcription request: model=${model}, file_size=${req.file.size} bytes, language=${language || 'auto'}`);
        // Create transcription request
        const options = {
            model,
            file: req.file.buffer,
            language,
            prompt,
            response_format,
            temperature
        };
        // Send request to OpenRouter
        const response = await openRouter.createTranscription(options);
        // Return the response
        res.status(200).json(response);
    }
    catch (error) {
        logger.error(`Audio transcription error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during audio transcription',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
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
                    message: 'Invalid request: audio URL is required',
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
        const openRouter = new OpenRouter({ apiKey });
        // Log the request
        logger.info(`Audio transcription from URL request: model=${model}, url=${url}, language=${language || 'auto'}`);
        // Fetch the audio file
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(400).json({
                error: {
                    message: `Failed to fetch audio from URL: ${response.statusText}`,
                    type: 'invalid_request_error'
                }
            });
        }
        const audioBuffer = await response.arrayBuffer();
        // Create transcription request
        const options = {
            model,
            file: audioBuffer,
            language,
            prompt,
            response_format,
            temperature
        };
        // Send request to OpenRouter
        const transcriptionResponse = await openRouter.createTranscription(options);
        // Return the response
        res.status(200).json(transcriptionResponse);
    }
    catch (error) {
        logger.error(`Audio transcription from URL error: ${error.message}`, error);
        res.status(error.status || 500).json({
            error: {
                message: error.message || 'An error occurred during audio transcription',
                type: error.name || 'server_error',
                code: error.status || 500,
                data: error.data
            }
        });
    }
});
export default router;
//# sourceMappingURL=audio.js.map