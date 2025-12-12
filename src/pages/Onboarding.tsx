import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Snowflake, Wallet, CheckCircle, MapPin, FileText, Users } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, parse } from 'date-fns';
import 'react-day-picker/style.css';
import { AccentButton } from '../components/ui/AccentButton';
import { GlassCard } from '../components/ui/GlassCard';
import { useApp } from '../context/AppContext';
import { INITIAL_USER_STATE } from '../lib/constants';
import { DestinationType, PlanMetadata } from '../lib/types';

export const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createPlan, joinPlan } = useApp();
  const isCreatingPlan = location.state?.createPlan;

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(INITIAL_USER_STATE);
  const [planMeta, setPlanMeta] = useState<PlanMetadata>({
    tripName: '',
    description: '',
    targetSize: 4,
    notes: '',
    destinationType: 'Domestic'
  });

  const handleUpdate = (field: string, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleMetaUpdate = (field: string, value: any) => {
    setPlanMeta((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = () => {
    if (isCreatingPlan) {
      createPlan(planMeta, profile);
      navigate('/plan');
    } else {
      // Just updating profile or joining
      // In a real flow, we might pass the plan ID to join here
      navigate('/account');
    }
  };

  const StepIndicator = ({ current, total }: { current: number; total: number }) => (
    <div className="flex justify-center space-x-2 mb-8">
      {[...Array(total)].map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i + 1 === current ? 'bg-[#F97316]' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const Step1Skill = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">1/5: What's your skill level?</h2>
      <p className="text-gray-600 mb-8">Choose the terrain you ride most comfortably.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Green Circle', 'Blue Square', 'Black Diamond'].map((level) => (
          <button
            key={level}
            onClick={() => handleUpdate('skill', level)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-200
              ${
                profile.skill === level
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Snowflake className="w-8 h-8 mx-auto mb-2 text-[#0EA5E9]" />
            <span
              className={`font-semibold ${
                profile.skill === level ? 'text-[#0EA5E9]' : 'text-[#1F2937]'
              }`}
            >
              {level}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <AccentButton onClick={nextStep} disabled={!profile.skill}>
          Next
        </AccentButton>
      </div>
    </>
  );

  const Step2Pass = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">2/5: What passes do you have?</h2>
      <div className="space-y-4">
        {['Epic Pass', 'Ikon Pass', 'None'].map((pass) => (
          <label
            key={pass}
            className="flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-gray-300"
          >
            <input
              type="radio"
              name="pass"
              value={pass}
              checked={profile.pass === pass}
              onChange={() => handleUpdate('pass', pass)}
              className="w-5 h-5 accent-[#0EA5E9]"
            />
            <span className="ml-4 text-lg font-medium">{pass}</span>
            {pass !== 'None' && (
              <span className="ml-auto text-sm text-gray-500">Save up to $250/day</span>
            )}
          </label>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={nextStep} disabled={!profile.pass}>
          Next
        </AccentButton>
      </div>
    </>
  );

  const Step3Budget = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">3/5: Trip Budget Preference</h2>
      <p className="text-gray-600 mb-8">This helps us find the right accommodation and resort tier.</p>
      <div className="flex justify-around">
        {['$', '$$', '$$$'].map((b) => (
          <button
            key={b}
            onClick={() => handleUpdate('budget', b)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-200 w-28 text-center
              ${
                profile.budget === b
                  ? 'border-[#F97316] bg-[#F97316]/10 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Wallet className="w-8 h-8 mx-auto mb-2 text-[#F97316]" />
            <span className="text-xl font-bold">{b}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={nextStep} disabled={!profile.budget}>
          Next
        </AccentButton>
      </div>
    </>
  );

  const Step4Availability = () => {
    const initialDates = profile.availability
      .map((d) => {
        try {
          const parsed = parse(d, 'MMM d', new Date());
          return parsed;
        } catch (e) {
          return null;
        }
      })
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    const [selectedDates, setSelectedDates] = useState<Date[] | undefined>(initialDates);

    const handleSelect = (dates: Date[] | undefined) => {
      setSelectedDates(dates);
      if (dates) {
        const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
        const formatted = sorted.map((d) => format(d, 'MMM d'));
        handleUpdate('availability', formatted);
      } else {
        handleUpdate('availability', []);
      }
    };

    return (
      <>
        <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">4/5: Your Availability</h2>
        <p className="text-gray-600 mb-8">Select your preferred travel dates from the calendar.</p>
        
        <div className="flex justify-center mb-6">
          <style>{`
            .rdp {
              --rdp-cell-size: 40px;
              --rdp-accent-color: #0EA5E9;
              --rdp-background-color: #e0f2fe;
              margin: 0;
            }
            .rdp-day_selected:not([disabled]) { 
              background-color: #0EA5E9; 
              color: white;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: #e0f2fe;
              color: #0EA5E9;
            }
          `}</style>
          <div className="p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm">
            <DayPicker
              mode="multiple"
              selected={selectedDates}
              onSelect={handleSelect}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
            Back
          </button>
          <AccentButton onClick={isCreatingPlan ? nextStep : handleSubmit} disabled={!profile.availability || profile.availability.length === 0}>
            {isCreatingPlan ? 'Next' : <><CheckCircle className="w-5 h-5 mr-2" /> Finish Setup</>}
          </AccentButton>
        </div>
      </>
    );
  };

  const Step5PlanDetails = () => (
    <>
      <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">5/5: Plan Details</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name / Type</label>
          <input 
            type="text" 
            placeholder="e.g. High School Reunion"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
            value={planMeta.tripName}
            onChange={(e) => handleMetaUpdate('tripName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination Preference (Required)</label>
          <div className="grid grid-cols-3 gap-2">
            {['Domestic', 'International', 'Local'].map((type) => (
              <button
                key={type}
                onClick={() => handleMetaUpdate('destinationType', type)}
                className={`
                  p-3 rounded-lg border text-sm font-medium transition-all
                  ${planMeta.destinationType === type 
                    ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                `}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {planMeta.destinationType === 'Local' ? 'Within 5-6 hour drive.' : 
             planMeta.destinationType === 'Domestic' ? 'Anywhere in the country.' : 'Global destinations.'}
          </p>
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Size</label>
            <input 
              type="number" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
              value={planMeta.targetSize}
              onChange={(e) => handleMetaUpdate('targetSize', parseInt(e.target.value))}
            />
          </div>
          <div className="flex-1">
             <label className="block text-sm font-medium text-gray-700 mb-1">Your Region</label>
             <input 
                type="text" 
                placeholder="e.g. California"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                value={profile.address}
                onChange={(e) => handleUpdate('address', e.target.value)}
              />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
           <textarea 
             className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none h-20"
             placeholder="Any other details..."
             value={planMeta.notes}
             onChange={(e) => handleMetaUpdate('notes', e.target.value)}
           />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
          Back
        </button>
        <AccentButton onClick={handleSubmit} disabled={!planMeta.tripName}>
          <CheckCircle className="w-5 h-5" />
          <span>Create Plan</span>
        </AccentButton>
      </div>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Skill />;
      case 2: return <Step2Pass />;
      case 3: return <Step3Budget />;
      case 4: return <Step4Availability />;
      case 5: return isCreatingPlan ? (
        <>
          <h2 className="text-2xl font-bold mb-6 text-[#1F2937]">5/5: Plan Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name / Type</label>
              <input 
                type="text" 
                placeholder="e.g. High School Reunion"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                value={planMeta.tripName}
                onChange={(e) => handleMetaUpdate('tripName', e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Preference (Required)</label>
              <div className="grid grid-cols-3 gap-2">
                {['Domestic', 'International', 'Local'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleMetaUpdate('destinationType', type)}
                    className={`
                      p-3 rounded-lg border text-sm font-medium transition-all
                      ${planMeta.destinationType === type 
                        ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                    `}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {planMeta.destinationType === 'Local' ? 'Within 5-6 hour drive.' : 
                 planMeta.destinationType === 'Domestic' ? 'Anywhere in the country.' : 'Global destinations.'}
              </p>
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Size</label>
                <input 
                  type="number" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                  value={planMeta.targetSize}
                  onChange={(e) => handleMetaUpdate('targetSize', parseInt(e.target.value))}
                />
              </div>
              <div className="flex-1">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Your Region</label>
                 <input 
                    type="text" 
                    placeholder="e.g. California"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none"
                    value={profile.address}
                    onChange={(e) => handleUpdate('address', e.target.value)}
                  />
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
               <textarea 
                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:outline-none h-20"
                 placeholder="Any other details..."
                 value={planMeta.notes}
                 onChange={(e) => handleMetaUpdate('notes', e.target.value)}
               />
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button onClick={prevStep} className="text-gray-500 hover:text-[#1F2937]">
              Back
            </button>
            <AccentButton onClick={handleSubmit} disabled={!planMeta.tripName}>
              <CheckCircle className="w-5 h-5" />
              <span>Create Plan</span>
            </AccentButton>
          </div>
        </>
      ) : null;
      default: return <Step1Skill />;
    }
  };

  // If not creating plan, step 5 is unreachable
  const totalSteps = isCreatingPlan ? 5 : 4;

  return (
    <div className="max-w-xl mx-auto py-12">
      <GlassCard>
        <StepIndicator current={step} total={totalSteps} />
        {renderStep()}
      </GlassCard>
    </div>
  );
};
