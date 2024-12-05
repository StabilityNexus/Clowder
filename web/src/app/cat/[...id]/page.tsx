import Layout from "@/components/Layout";

// Generate static params for IDs 1, 2, and 3
export function generateStaticParams() {
    return [
        { id: ['id'] }
    ];
}

export default function InteractionsPage({
    params,
}: {
    params: {
        id: string[]; // Expecting a single string, not an array
    };
}) {
    // Directly take the deploymentId from params.id
    const deploymentId = params.id[0];

    return (
        <Layout>
            <div className="justify-center text-center mt-9 text-xl">
                <h1>Your post: {deploymentId}</h1>
            </div>
        </Layout>
    );
}
