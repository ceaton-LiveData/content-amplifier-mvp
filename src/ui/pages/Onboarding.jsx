import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import FileUpload from '../components/FileUpload'
import { useAuth } from '../hooks/useAuth'
import { extractText } from '../../core/processing/text-extractor'
import { analyzeBrandVoice, analyzeStyleGuide } from '../../infrastructure/ai/claude'
import { updateAccount } from '../../infrastructure/database/supabase'

export default function Onboarding() {
  const { user, refreshAccount } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1: choose method, 2: input, 3: review
  const [method, setMethod] = useState(null) // 'styleguide', 'examples', or 'both'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Style guide upload state
  const [styleGuideFile, setStyleGuideFile] = useState(null)
  const [styleGuideText, setStyleGuideText] = useState('')

  // Writing examples state
  const [examples, setExamples] = useState(['', '', ''])

  // Shared fields
  const [targetAudience, setTargetAudience] = useState('')
  const [wordsToAvoid, setWordsToAvoid] = useState('')

  // Generated profile
  const [brandVoiceProfile, setBrandVoiceProfile] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  async function handleStyleGuideSelect(file) {
    setStyleGuideFile(file)
    setError(null)

    try {
      setLoading(true)
      const text = await extractText(file)
      setStyleGuideText(text)
    } catch (err) {
      setError(`Failed to extract text: ${err.message}`)
      setStyleGuideFile(null)
    } finally {
      setLoading(false)
    }
  }

  function updateExample(index, value) {
    const newExamples = [...examples]
    newExamples[index] = value
    setExamples(newExamples)
  }

  async function handleAnalyze() {
    setError(null)
    setLoading(true)

    try {
      let profile = ''

      if (method === 'styleguide') {
        // Extract rules from style guide
        profile = await analyzeStyleGuide(styleGuideText, targetAudience, wordsToAvoid)
      } else if (method === 'examples') {
        // Analyze writing examples
        const contentExamples = examples.filter(ex => ex.trim())
        if (contentExamples.length < 1) {
          throw new Error('Please provide at least one content example')
        }
        profile = await analyzeBrandVoice(contentExamples, targetAudience, wordsToAvoid)
      } else if (method === 'both') {
        // Combine style guide rules with example analysis
        const contentExamples = examples.filter(ex => ex.trim())
        profile = await analyzeBrandVoiceCombined(styleGuideText, contentExamples, targetAudience, wordsToAvoid)
      }

      setBrandVoiceProfile(profile)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function analyzeBrandVoiceCombined(styleGuide, contentExamples, audience, avoid) {
    // Use the combined analysis from claude.js
    const { analyzeBrandVoiceWithGuide } = await import('../../infrastructure/ai/claude')
    return analyzeBrandVoiceWithGuide(styleGuide, contentExamples, audience, avoid)
  }

  async function handleSave() {
    setError(null)
    setLoading(true)

    try {
      await updateAccount(user.id, {
        brand_voice_profile: brandVoiceProfile,
        brand_voice_source_type: method,
        target_audience: targetAudience,
        words_to_avoid: wordsToAvoid,
        example_content: examples.filter(ex => ex.trim()).length > 0
          ? examples.filter(ex => ex.trim())
          : null,
      })

      await refreshAccount()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    navigate('/dashboard')
  }

  // Check if we can proceed based on method
  function canProceed() {
    if (method === 'styleguide') {
      return !!styleGuideText
    } else if (method === 'examples') {
      return examples[0].trim().length > 0
    } else if (method === 'both') {
      return !!styleGuideText && examples[0].trim().length > 0
    }
    return false
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>Choose method</span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>Add content</span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>Review</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary-600 rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Choose method */}
        {step === 1 && (
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your brand voice</h1>
            <p className="text-gray-600 mb-6">
              Help us understand your writing style so we can generate content that sounds like you.
            </p>

            <div className="space-y-4">
              {/* Option 1: Style Guide */}
              <button
                onClick={() => {
                  setMethod('styleguide')
                  setStep(2)
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-primary-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Upload a Brand Style Guide</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We'll extract tone guidelines, do's and don'ts, and voice rules from your style guide.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Examples */}
              <button
                onClick={() => {
                  setMethod('examples')
                  setStep(2)
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-primary-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Paste Writing Examples</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We'll analyze your actual content (LinkedIn posts, blogs, etc.) to learn your writing style.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 3: Both */}
              <button
                onClick={() => {
                  setMethod('both')
                  setStep(2)
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-primary-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Both: Style Guide + Examples</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Best results! Combine your style guide rules with real writing examples.
                    </p>
                    <span className="inline-block mt-2 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <button onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-700">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Input content */}
        {step === 2 && (
          <div className="card">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {method === 'styleguide' && 'Upload your Brand Style Guide'}
              {method === 'examples' && 'Paste Writing Examples'}
              {method === 'both' && 'Add Style Guide & Examples'}
            </h1>
            <p className="text-gray-600 mb-6">
              {method === 'styleguide' && 'We\'ll extract tone guidelines, voice rules, and writing standards from your document.'}
              {method === 'examples' && 'Share 2-3 examples of your best content so we can learn your writing style.'}
              {method === 'both' && 'Upload your style guide and provide writing examples for the best results.'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Style Guide Upload (for 'styleguide' and 'both') */}
              {(method === 'styleguide' || method === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Style Guide {method === 'both' && <span className="text-red-500">*</span>}
                  </label>
                  <FileUpload
                    onFileSelect={handleStyleGuideSelect}
                    disabled={loading}
                  />
                  {styleGuideText && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-700">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">{styleGuideFile?.name}</span>
                        <span className="text-sm text-green-600 ml-2">
                          ({(styleGuideText.length / 1000).toFixed(1)}k characters)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Writing Examples (for 'examples' and 'both') */}
              {(method === 'examples' || method === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Writing Examples {method === 'both' && <span className="text-red-500">*</span>}
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Paste 2-3 examples of content you've written (LinkedIn posts, blog excerpts, emails, etc.)
                  </p>
                  <div className="space-y-3">
                    {examples.map((example, index) => (
                      <div key={index}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Example {index + 1} {index === 0 && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={example}
                          onChange={(e) => updateExample(index, e.target.value)}
                          className="input min-h-[100px]"
                          placeholder={`Paste your ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'} content example here...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shared fields */}
              <div className="border-t pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target audience (optional)
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="input"
                      placeholder="e.g., B2B SaaS marketers, healthcare executives"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Words or phrases to avoid (optional)
                    </label>
                    <input
                      type="text"
                      value={wordsToAvoid}
                      onChange={(e) => setWordsToAvoid(e.target.value)}
                      className="input"
                      placeholder="e.g., synergy, leverage, circle back"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!canProceed() || loading}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Create Brand Voice Profile'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review profile */}
        {step === 3 && (
          <div className="card">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Brand Voice Profile</h1>
            <p className="text-gray-600 mb-6">
              Review the generated profile. You can edit it if needed.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="relative">
              {isEditing ? (
                <textarea
                  value={brandVoiceProfile}
                  onChange={(e) => setBrandVoiceProfile(e.target.value)}
                  className="input min-h-[400px] font-mono text-sm"
                />
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg prose prose-sm max-w-none min-h-[200px]">
                  {brandVoiceProfile.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">{paragraph}</p>
                  ))}
                </div>
              )}

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="absolute top-2 right-2 text-sm text-primary-600 hover:text-primary-700"
              >
                {isEditing ? 'Preview' : 'Edit'}
              </button>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-secondary"
              >
                Regenerate
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save & Continue'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
