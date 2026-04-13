// src/utils/skinRoutineUtils.js

export const generateRoutine = (result, skinType) => {
  let routine = { day: [], night: [], note: "", conditionKeyword: "" };
  if (!result) return routine;

  const acne = result?.acne?.score || 5;
  const wEye = result?.wrinkles_eyes?.score || 5;
  const wForehead = result?.wrinkles_forehead?.score || 5;
  const wMouth = result?.wrinkles_mouth?.score || 5;

  // TRƯỜNG HỢP 2: MỤN CAO (Acne <= 2.5) -> Ưu tiên 1
  if (acne <= 2.5) {
    routine.note = "Lưu ý: Da đang có dấu hiệu mụn nghiêm trọng. Khuyến nghị thăm khám bác sĩ da liễu để được điều trị phù hợp.";
    routine.conditionKeyword = "Ngừa mụn";
    routine.day = [
      { title: "Rửa mặt sạch bằng sữa rửa mặt dịu nhẹ", searchKey: "Cleaners" },
      { title: "Cân bằng da bằng toner không cồn", searchKey: "Toner" },
      { title: "Thoa serum kiểm soát mụn", searchKey: "Serum" },
      { title: "Thoa kem chống nắng không gây bít tắc lỗ chân lông", searchKey: "Sunscreen" }
    ];
    routine.night = [
      { title: "Tẩy trang nhẹ nhàng, làm sạch sâu lớp trang điểm và bụi bẩn", searchKey: "Makeup Remover" },
      { title: "Rửa mặt lần hai để làm sạch hoàn toàn", searchKey: "Cleaners" },
      { title: "Tẩy tế bào chết nhẹ nhàng (1 lần/tuần)", searchKey: "Facial Exfoliator" },
      { title: "Cân bằng lại da bằng toner không cồn", searchKey: "Toner" },
      { title: "Đắp mặt nạ kiểm soát mụn (2 lần/tuần)", searchKey: "Mask" },
      { title: "Thoa serum điều trị mụn", searchKey: "Serum" },
      { title: "Dưỡng ẩm bằng kem nhẹ, dạng gel", searchKey: "Moisturizer" }
    ];
  } 
  // TRƯỜNG HỢP 3: LÃO HÓA (Wrinkles <= 2.5) -> Ưu tiên 2
  else if (wEye <= 2.5 || wForehead <= 2.5 || wMouth <= 2.5) {
    routine.conditionKeyword = "Chống lão hóa";
    routine.day = [
      { title: "Rửa mặt nhẹ nhàng bằng sữa rửa mặt dịu nhẹ", searchKey: "Cleaners" },
      { title: "Thoa kem chống nắng để bảo vệ da khỏi tia UV", searchKey: "Sunscreen" }
    ];
    routine.night = [
      { title: "Tẩy trang sạch hoàn toàn trước khi dưỡng da", searchKey: "Makeup Remover" },
      { title: "Rửa mặt lần hai để loại bỏ cặn tẩy trang", searchKey: "Cleaners" },
      { title: "Cấp ẩm tức thì bằng toner dưỡng ẩm", searchKey: "Toner" },
      { title: "Đắp mặt nạ phục hồi và cấp ẩm chuyên sâu (2 lần/tuần)", searchKey: "Mask" },
      { title: "Thoa serum chống lão hóa để cải thiện nếp nhăn", searchKey: "Serum" },
      { title: "Khóa ẩm bằng kem dưỡng phục hồi da ban đêm", searchKey: "Moisturizer" }
    ];
  } 
  // TRƯỜNG HỢP 1: DA KHỎE (Dựa vào Skin Type)
  else {
    if (skinType === 'Da thường') {
      routine.conditionKeyword = "";
      routine.day = [
        { title: "Rửa mặt sạch bằng sữa rửa mặt dịu nhẹ", searchKey: "Cleaners" },
        { title: "Thoa kem chống nắng bảo vệ da mỗi ngày", searchKey: "Sunscreen" }
      ];
      routine.night = [
        { title: "Tẩy trang sạch để tránh bít tắc lỗ chân lông qua đêm", searchKey: "Makeup Remover" },
        { title: "Rửa mặt lần hai để làm sạch hoàn toàn", searchKey: "Cleaners" },
        { title: "Cân bằng và dưỡng ẩm nhẹ bằng toner", searchKey: "Toner" },
        { title: "Đắp mặt nạ dưỡng ẩm và phục hồi da (2 lần/tuần)", searchKey: "Mask" },
        { title: "Thoa serum duy trì làn da khỏe mạnh", searchKey: "Serum" },
        { title: "Khóa ẩm bằng kem dưỡng qua đêm", searchKey: "Moisturizer" }
      ];
    } else if (skinType === 'Da khô') {
      routine.conditionKeyword = "Cấp ẩm";
      routine.day = [
        { title: "Rửa mặt bằng nước ấm, không dùng sữa rửa mặt buổi sáng", searchKey: "" },
        { title: "Thoa kem chống nắng dạng kem để vừa bảo vệ vừa dưỡng ẩm", searchKey: "Sunscreen" }
      ];
      routine.night = [
        { title: "Tẩy trang nhẹ nhàng để không làm da thêm khô", searchKey: "Makeup Remover" },
        { title: "Rửa mặt bằng sữa rửa mặt dạng kem dịu nhẹ", searchKey: "Cleaners" },
        { title: "Bổ sung ẩm tức thì bằng toner cấp ẩm", searchKey: "Toner" },
        { title: "Đắp mặt nạ cấp ẩm chuyên sâu (2 lần/tuần)", searchKey: "Mask" },
        { title: "Thoa serum cấp ẩm nhiều tầng cho da", searchKey: "Serum" },
        { title: "Khóa ẩm bằng kem dưỡng dày dặn, giàu dưỡng chất", searchKey: "Moisturizer" }
      ];
    } else if (skinType === 'Da dầu') {
      routine.conditionKeyword = "Kiềm dầu";
      routine.day = [
        { title: "Làm sạch sâu bằng sữa rửa mặt kiểm soát bã nhờn", searchKey: "Cleaners" },
        { title: "Thu nhỏ lỗ chân lông và kiềm dầu bằng toner", searchKey: "Toner" },
        { title: "Thoa serum cân bằng lượng dầu tiết ra", searchKey: "Serum" },
        { title: "Thoa kem chống nắng dạng gel, không gây bóng nhờn", searchKey: "Sunscreen" }
      ];
      routine.night = [
        { title: "Tẩy trang sạch lớp bã nhờn và bụi bẩn tích tụ trong ngày", searchKey: "Makeup Remover" },
        { title: "Rửa mặt bằng sữa rửa mặt dạng gel kiểm soát dầu", searchKey: "Cleaners" },
        { title: "Tẩy tế bào chết để thông thoáng lỗ chân lông (1 lần/tuần)", searchKey: "Facial Exfoliator" },
        { title: "Cân bằng da và kiểm soát bã nhờn bằng toner", searchKey: "Toner" },
        { title: "Đắp mặt nạ hút nhờn, thông thoáng lỗ chân lông (2 lần/tuần)", searchKey: "Mask" },
        { title: "Thoa serum kiềm dầu và điều tiết bã nhờn", searchKey: "Serum" },
        { title: "Dưỡng ẩm bằng kem dạng gel nhẹ, không gây bít tắc lỗ chân lông", searchKey: "Moisturizer" }
      ];
    } else if (skinType === 'Da nhạy cảm') {
      routine.conditionKeyword = "Nhạy cảm";
      routine.day = [
        { title: "Rửa mặt nhẹ nhàng bằng sữa rửa mặt không mùi, không cồn", searchKey: "Cleaners" },
        { title: "Làm dịu và phục hồi da bằng toner dịu nhẹ", searchKey: "Toner" },
        { title: "Thoa serum củng cố hàng rào bảo vệ da", searchKey: "Serum" },
        { title: "Thoa kem chống nắng vật lý, dịu nhẹ với da nhạy cảm", searchKey: "Sunscreen" }
      ];
      routine.night = [
        { title: "Tẩy trang, không cần chà xát mạnh", searchKey: "Makeup Remover" },
        { title: "Rửa mặt nhẹ bằng sữa rửa mặt dành riêng cho da nhạy cảm", searchKey: "Cleaners" },
        { title: "Làm dịu kích ứng và cấp ẩm bằng toner phục hồi da", searchKey: "Toner" },
        { title: "Đắp mặt nạ làm dịu da (2 lần/tuần)", searchKey: "Mask" },
        { title: "Thoa serum phục hồi và tái tạo hàng rào bảo vệ da", searchKey: "Serum" },
        { title: "Khóa ẩm bằng kem dưỡng dịu nhẹ, không gây kích ứng", searchKey: "Moisturizer" }
      ];
    }
  }
  
  return routine;
};