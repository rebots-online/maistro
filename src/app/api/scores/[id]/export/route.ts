import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { canExport, processExport, ExportFormat } from '@/lib/subscription';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return new NextResponse(null, { status: 401 });
  }

  const { format } = await request.json();
  if (!format || !Object.keys(ExportFormat).includes(format)) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid export format' }),
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return new NextResponse(null, { status: 401 });
    }

    // Check if user can export
    const { canExport: allowed, reason } = await canExport(user, format as ExportFormat);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: reason }),
        { status: 403 }
      );
    }

    // Process the export
    await processExport(user, format as ExportFormat, params.id);

    // Generate the actual export file
    const score = await prisma.score.findUnique({
      where: { id: params.id }
    });

    if (!score) {
      return new NextResponse(
        JSON.stringify({ error: 'Score not found' }),
        { status: 404 }
      );
    }

    // TODO: Implement actual file generation based on format
    const fileContent = 'Placeholder for exported file';
    
    // Create export record
    await prisma.scoreExport.create({
      data: {
        format,
        cost: 1, // Get from EXPORT_COSTS
        scoreId: score.id,
        userId: user.id
      }
    });

    // Return the file
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="score.${format}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Export failed' }),
      { status: 500 }
    );
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'midi':
      return 'audio/midi';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'xml':
      return 'application/xml';
    default:
      return 'application/octet-stream';
  }
}
