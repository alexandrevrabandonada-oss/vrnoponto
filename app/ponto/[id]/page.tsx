export default function Ponto({ params }: { params: { id: string } }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold">VR no Ponto - /ponto/{params.id}</h1>
        </main>
    );
}
