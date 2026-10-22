package com.teampulse.backend.service;

import com.teampulse.backend.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Bounded structural validation; WebP container checks do not replace a full codec. */
final class AvatarImageValidator {
	private static final long MAX_PIXELS = 25_000_000;
	private AvatarImageValidator() {}
	static void validate(MultipartFile file) {
		if (file == null || file.isEmpty() || file.getSize() > 5L * 1024 * 1024) throw invalid();
		try {
			byte[] bytes = file.getBytes();
			String name = file.getOriginalFilename(); String mime = file.getContentType();
			if (name == null || mime == null) throw invalid();
			name = name.toLowerCase(Locale.ROOT); mime = mime.toLowerCase(Locale.ROOT);
			boolean png = bytes.length >= 8 && (bytes[0]&255)==137 && bytes[1]==80 && bytes[2]==78 && bytes[3]==71
					&& bytes[4]==13 && bytes[5]==10 && bytes[6]==26 && bytes[7]==10;
			boolean jpeg = bytes.length >= 4 && (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[2]&255)==255;
			boolean webp = bytes.length >= 20 && text(bytes,0,4).equals("RIFF") && text(bytes,8,4).equals("WEBP");
			if (webp) {
				if (!name.endsWith(".webp") || !mime.equals("image/webp") || unsigned(bytes,4,4)+8 != bytes.length) throw invalid();
				boolean frame = false;
				for (long offset=12; offset+8<=bytes.length;) {
					int index=(int)offset; long size=unsigned(bytes,index+4,4); long end=offset+8+size;
					if (end>bytes.length) throw invalid(); String chunk=text(bytes,index,4);
					if (chunk.equals("VP8X")) {
						if (size!=10) throw invalid();
						checkDimensions(unsigned(bytes,index+12,3)+1, unsigned(bytes,index+15,3)+1);
					} else if (chunk.equals("VP8 ")) {
						if (size<10 || (bytes[index+11]&255)!=157 || bytes[index+12]!=1 || bytes[index+13]!=42) throw invalid();
						checkDimensions(unsigned(bytes,index+14,2)&16383, unsigned(bytes,index+16,2)&16383); frame=true;
					} else if (chunk.equals("ANMF")) {
						if (size < 29) throw invalid();
						checkDimensions(unsigned(bytes,index+14,3)+1, unsigned(bytes,index+17,3)+1);
						int nested=index+24;
						// Animated frames contain their own VP8/VP8L bitstream chunk.
						while (nested+8 <= end) {
							long nestedSize=unsigned(bytes,nested+4,4);
							long next=nested+8L+nestedSize+(nestedSize&1);
							if (next>end) throw invalid();
							String type=text(bytes,nested,4);
							if (type.equals("VP8L") && nestedSize>=5 && bytes[nested+8]==47) frame=true;
							if (type.equals("VP8 ") && nestedSize>=10 && (bytes[nested+11]&255)==157 && bytes[nested+12]==1 && bytes[nested+13]==42) frame=true;
							nested=(int)next;
						}
						if (nested!=end) throw invalid();
					} else if (chunk.equals("VP8L")) {
						if (size<5 || bytes[index+8]!=47) throw invalid();
						long bits=unsigned(bytes,index+9,4); checkDimensions((bits&16383)+1, ((bits>>14)&16383)+1); frame=true;
					}
					offset=end+(size&1);
					if (offset>bytes.length) throw invalid();
					if (offset==bytes.length && frame) return;
				}
				throw invalid();
			}
			if (!(png && name.endsWith(".png") && mime.equals("image/png"))
					&& !(jpeg && (name.endsWith(".jpg") || name.endsWith(".jpeg")) && mime.equals("image/jpeg"))) throw invalid();
			try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
				var readers = ImageIO.getImageReaders(input); if (!readers.hasNext()) throw invalid();
				var reader=readers.next();
				try { reader.setInput(input); checkDimensions(reader.getWidth(0),reader.getHeight(0)); if (reader.read(0)==null) throw invalid(); }
				finally { reader.dispose(); }
			}
		} catch (BadRequestException ex) { throw ex; }
		catch (Exception ex) { throw invalid(); }
	}
	private static String text(byte[] bytes,int offset,int size) { return new String(bytes,offset,size,StandardCharsets.US_ASCII); }
	private static long unsigned(byte[] bytes,int offset,int size) { long result=0; for(int i=0;i<size;i++) result|=(long)(bytes[offset+i]&255)<<(i*8); return result; }
	private static void checkDimensions(long width,long height) { if(width<1 || height<1 || width*height>MAX_PIXELS) throw invalid(); }
	private static BadRequestException invalid() { return new BadRequestException("Invalid or oversized image content, MIME type, or filename."); }
}
