import TextToCADGenerator from '@/src/components/ai/TextToCADGenerator';
import Layout from '@/src/components/layout/Layout';
import AIHub from 'src/components/ai/AIHub';

function AIPanelPage() {
  return (
    <Layout>
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Design Tools</h1>
      <AIHub className="h-[80vh]" />
     
    </div>
    </Layout>
  );
}

export default AIPanelPage;