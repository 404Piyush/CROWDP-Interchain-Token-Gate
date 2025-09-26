'use client';

export default function FontTest() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center font-druk">Font Test Page</h1>
        
        {/* Arkitech Font Tests */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 font-druk">Arkitech Font (Primary)</h2>
          <p className="text-lg mb-2 font-arkitech">This is Arkitech Regular text - now the primary font</p>
          <p className="text-lg mb-2 font-arkitech font-medium">This is Arkitech Medium text</p>
          <p className="text-lg mb-2 font-arkitech font-semibold">This is Arkitech SemiBold text</p>
          <p className="text-lg mb-2 font-arkitech font-thin">This is Arkitech Thin text</p>
        </div>

        {/* DrukWideBold Font Tests */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 font-druk">DrukWideBold Font (Secondary - Headings)</h2>
          <h1 className="text-3xl font-bold mb-2 font-druk">H1 Heading with DrukWideBold</h1>
          <h2 className="text-2xl font-bold mb-2 font-druk">H2 Heading with DrukWideBold</h2>
          <h3 className="text-xl font-bold mb-2 font-druk">H3 Heading with DrukWideBold</h3>
          <p className="text-lg font-druk">Regular text with DrukWideBold</p>
        </div>

        {/* Poppins Font Tests */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 font-druk">Poppins Font (Tertiary - Fallback)</h2>
          <p className="text-lg mb-2 font-poppins">This is Poppins Regular text - now tertiary</p>
          <p className="text-lg mb-2 font-poppins font-medium">This is Poppins Medium text</p>
          <p className="text-lg mb-2 font-poppins font-semibold">This is Poppins SemiBold text</p>
          <p className="text-lg mb-2 font-poppins font-thin">This is Poppins Thin text</p>
        </div>

        {/* System Font Comparison */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 font-druk">System Font Comparison</h2>
          <p className="text-lg mb-2 font-sans">This is system sans-serif font</p>
          <p className="text-lg mb-2 font-serif">This is system serif font</p>
          <p className="text-lg mb-2 font-mono">This is system monospace font</p>
        </div>

        {/* New Font Hierarchy Test */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 font-druk">New Font Hierarchy</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2 font-druk">Primary Font (Arkitech)</h3>
              <p className="font-primary">This uses the .font-primary utility class</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2 font-druk">Secondary Font (DrukWideBold)</h3>
              <p className="font-secondary">This uses the .font-secondary utility class</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2 font-druk">Tertiary Font (Poppins)</h3>
              <p className="font-tertiary">This uses the .font-tertiary utility class</p>
            </div>
          </div>
        </div>

        {/* Font Loading Test Button */}
        <div className="text-center">
          <button 
            onClick={() => {
              console.log('Font loading status:');
              document.fonts.forEach(font => {
                console.log(`${font.family} ${font.style} ${font.weight}: ${font.status}`);
              });
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded font-arkitech"
          >
            Check Font Loading Status (Console)
          </button>
        </div>
      </div>
    </div>
  );
}